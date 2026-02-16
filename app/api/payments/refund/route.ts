// ============================================================
// POST /api/payments/refund
// Owner-initiated refund for a booking payment.
//
// Input:  { bookingId, reason, penaltyPercent? }
// Output: { refundId, refundAmount, status }
//
// Partial refund logic:
//   penaltyPercent = 0   → full refund
//   penaltyPercent = 50  → refund 50% of advance
//   penaltyPercent = 100 → no refund (penalty = full advance)
// ============================================================

import { NextRequest, NextResponse }  from "next/server";
import { createRouteHandlerClient }   from "@supabase/auth-helpers-nextjs";
import { createClient }               from "@supabase/supabase-js";
import { cookies }                    from "next/headers";
import { initiateRefund }             from "@/lib/payments/razorpay-client";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────
  const supabaseAuth = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // ── Input ─────────────────────────────────────────────────
  const body = await request.json();
  const {
    bookingId,
    reason         = "Cancellation",
    penaltyPercent = 0,   // 0–100
  } = body;

  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
  }

  const penalty = Math.max(0, Math.min(100, Number(penaltyPercent)));

  const supabase = getAdmin();

  // ── Fetch booking + payment ───────────────────────────────
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .select(`
      id, business_id, status,
      businesses(owner_id)
    `)
    .eq("id", bookingId)
    .single();

  if (bookingErr || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // ── Ownership check ───────────────────────────────────────
  const business = (booking as Record<string, unknown>).businesses as Record<string, string> | null;
  if (!business || business.owner_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Fetch completed payment ───────────────────────────────
  const { data: payment, error: paymentErr } = await supabase
    .from("payments")
    .select("id, amount, razorpay_payment_id, status, refund_status")
    .eq("booking_id", bookingId)
    .eq("status", "completed")
    .maybeSingle();

  if (paymentErr || !payment) {
    return NextResponse.json(
      { error: "No completed payment found for this booking" },
      { status: 404 },
    );
  }

  if (payment.refund_status === "processed") {
    return NextResponse.json(
      { error: "Refund already processed for this booking" },
      { status: 409 },
    );
  }

  const isCashPayment =
    !payment.razorpay_payment_id ||
    (payment.razorpay_payment_id as string) === "cash";

  // ── Calculate refund amount ───────────────────────────────
  const refundAmount = payment.amount * ((100 - penalty) / 100);

  if (refundAmount <= 0 || isCashPayment) {
    // 100% penalty or cash payment → update DB only (no Razorpay)
    const updateStatus = refundAmount <= 0 ? "waived" : "processed";
    await supabase
      .from("payments")
      .update({
        refund_status: updateStatus,
        refund_amount: refundAmount,
        refund_reason: reason,
        status:        "refunded",
        refunded_at:   new Date().toISOString(),
      })
      .eq("id", payment.id);

    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);

    return NextResponse.json({
      refundId:     null,
      refundAmount: refundAmount,
      status:       updateStatus,
    });
  }

  // ── Initiate Razorpay refund ──────────────────────────────
  let refundResult;
  try {
    refundResult = await initiateRefund({
      paymentId:    payment.razorpay_payment_id,
      amountRupees: refundAmount,
      notes:        { reason, booking_id: bookingId },
      speed:        "optimum",
    });
  } catch (err: unknown) {
    console.error("[payments/refund]", err);
    return NextResponse.json(
      { error: "Refund initiation failed. Please try again or contact support." },
      { status: 502 },
    );
  }

  // ── Update payment row ────────────────────────────────────
  await supabase.from("payments").update({
    refund_id:     refundResult.refundId,
    refund_amount: refundResult.amountRupees,
    refund_status: "pending", // webhook will set to 'processed'
    refund_reason: reason,
  }).eq("id", payment.id);

  // ── Cancel booking ────────────────────────────────────────
  await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  return NextResponse.json({
    refundId:     refundResult.refundId,
    refundAmount: refundResult.amountRupees,
    status:       refundResult.status,
  });
}
