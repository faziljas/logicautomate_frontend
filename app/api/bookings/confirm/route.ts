// ============================================================
// BookFlow — Confirm Booking API (post-payment webhook)
// app/api/bookings/confirm/route.ts
//
// POST /api/bookings/confirm   → called by client after Razorpay
// POST /api/webhooks/razorpay  → called by Razorpay server webhook
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";
import crypto                        from "crypto";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ─────────────────────────────────────────
// POST /api/bookings/confirm
// Called from client after Razorpay success handler.
// Verifies the payment signature, then confirms the booking.
// ─────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = getAdmin();

  let body: {
    bookingId:          string;
    razorpayOrderId:    string;
    razorpayPaymentId:  string;
    razorpaySignature:  string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

  if (!bookingId || !razorpayOrderId || !razorpayPaymentId || razorpaySignature === undefined) {
    return NextResponse.json(
      { error: "bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature are required" },
      { status: 400 }
    );
  }

  // ── 1. Verify Razorpay signature (skip for pay-at-venue / cash) ──
  if (razorpaySignature !== "skip") {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Payment verification not configured" }, { status: 500 });
    }
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSig !== razorpaySignature) {
      console.error("[confirm] signature mismatch");
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }
  }

  // ── 2. Fetch booking ─────────────────────────────────────
  const { data: booking, error: bookingErr } = await supabase
    .from("bookings")
    .select(`
      id, status, business_id, customer_id,
      total_amount, advance_paid,
      booking_date, booking_time,
      service_id, staff_id,
      services(name),
      customers(name, phone),
      staff(users(name))
    `)
    .eq("id", bookingId)
    .single();

  if (bookingErr || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.status === "confirmed") {
    // Idempotent — already confirmed, return success
    return NextResponse.json({ status: "confirmed", bookingId });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json(
      { error: "Booking has been cancelled" },
      { status: 409 }
    );
  }

  // ── 3. Fetch payment record ──────────────────────────────
  const { data: payment } = await supabase
    .from("payments")
    .select("id, amount")
    .eq("booking_id", bookingId)
    .eq("razorpay_order_id", razorpayOrderId)
    .single();

  const advanceAmount = payment?.amount ?? 0;

  // ── 4. Update payment → completed ───────────────────────
  await supabase
    .from("payments")
    .update({
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature:  razorpaySignature === "skip" ? null : razorpaySignature,
      status:              "completed",
      paid_at:             new Date().toISOString(),
      ...(razorpayPaymentId === "cash" && { payment_method: "cash" }),
    })
    .eq("booking_id", bookingId)
    .eq("razorpay_order_id", razorpayOrderId);

  // ── 5. Update booking → confirmed ───────────────────────
  await supabase
    .from("bookings")
    .update({
      status:       "confirmed",
      advance_paid: advanceAmount,
    })
    .eq("id", bookingId);

  // ── 6. Queue WhatsApp confirmation ───────────────────────
  // Fire-and-forget — failure doesn't break the booking
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, type: "confirmation" }),
    });
  } catch (e) {
    console.warn("[confirm] WhatsApp send failed (non-fatal):", e);
  }

  return NextResponse.json({ status: "confirmed", bookingId }, { status: 200 });
}
