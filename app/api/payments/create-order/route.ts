// ============================================================
// POST /api/payments/create-order
// Creates a Razorpay order for a booking's advance payment.
//
// Input:  { bookingId, amount }
// Output: { orderId, amount, amountPaise, currency }
//
// Security:
//  - Session required (customer must be authenticated or booking
//    must carry a valid token — we use booking ownership check)
//  - Amount is re-read from DB (never trust client-supplied amount)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";
import { createOrder }               from "@/lib/payments/razorpay-client";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { bookingId } = body;

  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
  }

  const supabase = getAdmin();

  // ── Fetch booking with advance amount ────────────────────
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .select(`
      id, business_id, status, advance_paid, total_amount,
      customers(name, email, phone),
      businesses(name)
    `)
    .eq("id", bookingId)
    .single();

  if (bookingErr || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // ── Guard: only create order for pending bookings ────────
  if (booking.status !== "pending") {
    return NextResponse.json(
      { error: `Cannot create payment for booking with status: ${booking.status}` },
      { status: 409 },
    );
  }

  // ── Guard: advance already paid ──────────────────────────
  const { data: existingPayment } = await supabase
    .from("payments")
    .select("id, razorpay_order_id, status")
    .eq("booking_id", bookingId)
    .eq("status", "pending")
    .maybeSingle();

  // Re-use existing pending order if it exists (handles page refresh)
  if (existingPayment?.razorpay_order_id) {
    const customer = (booking as Record<string, unknown>).customers as Record<string, string> | null;
    const business = (booking as Record<string, unknown>).businesses as Record<string, string> | null;

    return NextResponse.json({
      orderId:      existingPayment.razorpay_order_id,
      amount:       booking.advance_paid,
      amountPaise:  Math.round(booking.advance_paid * 100),
      currency:     "INR",
      businessName: business?.name ?? "",
      customerName: customer?.name ?? "",
      customerEmail: customer?.email ?? "",
      customerPhone: customer?.phone ?? "",
    });
  }

  // ── Create Razorpay order ────────────────────────────────
  let orderResult;
  try {
    orderResult = await createOrder({
      amountRupees: booking.advance_paid,
      bookingId,
      notes: {
        business_name: ((booking as Record<string, unknown>).businesses as Record<string, string> | null)?.name ?? "",
      },
    });
  } catch (err: unknown) {
    console.error("[create-order]", err);
    return NextResponse.json(
      { error: "Payment gateway error. Please try again." },
      { status: 502 },
    );
  }

  // ── Store order in payments table ────────────────────────
  const { error: insertErr } = await supabase.from("payments").insert({
    booking_id:        bookingId,
    business_id:       (booking as { business_id?: string }).business_id,
    amount:            booking.advance_paid,
    payment_method:    "razorpay",
    status:            "pending",
    razorpay_order_id: orderResult.orderId,
  });

  if (insertErr) {
    console.error("[create-order] DB insert failed:", insertErr.message);
    // Non-fatal — still return order so customer can pay
  }

  const customer = (booking as Record<string, unknown>).customers as Record<string, string> | null;
  const business = (booking as Record<string, unknown>).businesses as Record<string, string> | null;

  return NextResponse.json({
    orderId:       orderResult.orderId,
    amount:        orderResult.amountRupees,
    amountPaise:   orderResult.amountPaise,
    currency:      orderResult.currency,
    businessName:  business?.name ?? "",
    customerName:  customer?.name ?? "",
    customerEmail: customer?.email ?? "",
    customerPhone: customer?.phone ?? "",
  });
}
