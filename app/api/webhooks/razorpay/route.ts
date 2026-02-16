// ============================================================
// POST /api/webhooks/razorpay
// Receives Razorpay event webhooks.
//
// Events handled:
//   payment.captured  → confirm booking, send WhatsApp
//   payment.failed    → mark payment failed, notify customer
//   refund.processed  → update refund status in payments table
//
// Security: HMAC-SHA256 signature verified before any DB write.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";
import { verifyWebhookSignature, validateAmount } from "@/lib/payments/signature-validator";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── Event handlers ────────────────────────────────────────────

async function handlePaymentCaptured(
  supabase: ReturnType<typeof getAdmin>,
  payload: Record<string, unknown>,
) {
  const payment = (payload as { payment?: { entity?: Record<string, unknown> } })
    ?.payment?.entity;
  if (!payment) return { error: "Missing payment entity" };

  const razorpayPaymentId = (payment as Record<string, unknown>).id as string;
  const razorpayOrderId   = (payment as Record<string, unknown>).order_id as string;
  const paidPaise         = (payment as Record<string, unknown>).amount as number;
  const method            = ((payment as Record<string, unknown>).method as string) || "razorpay";
  // Map Razorpay method to our enum: razorpay, cash, upi, card
  const paymentMethod     = ["upi", "card"].includes(method) ? method : "razorpay";

  // Fetch our payment record
  const { data: paymentRow, error: paymentErr } = await supabase
    .from("payments")
    .select("id, booking_id, amount, status")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();

  if (paymentErr || !paymentRow) {
    console.error("[razorpay-webhook] payment record not found for order:", razorpayOrderId);
    return { error: "Payment record not found" };
  }

  // Idempotency — already captured
  if (paymentRow.status === "completed") {
    return { ok: true, idempotent: true };
  }

  // Amount tamper check
  if (!validateAmount(paidPaise, paymentRow.amount)) {
    console.error(
      `[razorpay-webhook] Amount mismatch: paid ${paidPaise} paise, expected ${paymentRow.amount} rupees`,
    );
    return { error: "Amount mismatch" };
  }

  // Update payment
  await supabase
    .from("payments")
    .update({
      status:               "completed",
      razorpay_payment_id:  razorpayPaymentId,
      payment_method:       paymentMethod,
      paid_at:              new Date().toISOString(),
    })
    .eq("id", paymentRow.id);

  // Confirm booking
  const { data: booking } = await supabase
    .from("bookings")
    .update({ status: "confirmed", advance_paid: paymentRow.amount })
    .eq("id", paymentRow.booking_id)
    .select("id, business_id")
    .single();

  // Fire WhatsApp confirmation (non-blocking)
  if (booking) {
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
    if (baseUrl) {
      fetch(`${baseUrl}/api/whatsapp/send`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ bookingId: booking.id, type: "confirmation" }),
      }).catch(err => console.error("[razorpay-webhook] WhatsApp send failed:", err));
    }
  }

  return { ok: true, bookingId: paymentRow.booking_id };
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof getAdmin>,
  payload: Record<string, unknown>,
) {
  const payment = (payload as { payment?: { entity?: Record<string, unknown> } })
    ?.payment?.entity;
  if (!payment) return { error: "Missing payment entity" };
  const p = payment as Record<string, unknown>;

  const razorpayOrderId = p.order_id as string;
  const errorCode       = (p.error_code as string) ?? null;
  const errorDesc       = (p.error_description as string) ?? null;

  await supabase
    .from("payments")
    .update({
      status:         "failed",
      error_code:     errorCode,
      error_message:  errorDesc,
      updated_at:     new Date().toISOString(),
    })
    .eq("razorpay_order_id", razorpayOrderId)
    .eq("status", "pending"); // don't overwrite already-completed payments

  return { ok: true };
}

async function handleRefundProcessed(
  supabase: ReturnType<typeof getAdmin>,
  payload: Record<string, unknown>,
) {
  const refund = (payload as { refund?: { entity?: Record<string, unknown> } })
    ?.refund?.entity;
  if (!refund) return { error: "Missing refund entity" };
  const r = refund as Record<string, unknown>;

  const refundId        = r.id as string;
  const razorpayPaymentId = r.payment_id as string;
  const refundPaise     = r.amount as number;

  await supabase
    .from("payments")
    .update({
      refund_id:     refundId,
      refund_amount: refundPaise / 100,
      refund_status: "processed",
      refunded_at:   new Date().toISOString(),
    })
    .eq("razorpay_payment_id", razorpayPaymentId);

  return { ok: true, refundId };
}

// ── Main handler ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // ── Signature verification ───────────────────────────────
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  let sigValid: boolean;

  try {
    sigValid = verifyWebhookSignature(rawBody, signature);
  } catch (err: unknown) {
    console.error("[razorpay-webhook] Signature check error:", err);
    return NextResponse.json({ error: "Signature check failed" }, { status: 500 });
  }

  if (!sigValid) {
    console.warn("[razorpay-webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let event: { event: string; payload: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = getAdmin();
  let result: Record<string, unknown>;

  switch (event.event) {
    case "payment.captured":
      result = await handlePaymentCaptured(supabase, event.payload);
      break;
    case "payment.failed":
      result = await handlePaymentFailed(supabase, event.payload);
      break;
    case "refund.processed":
      result = await handleRefundProcessed(supabase, event.payload);
      break;
    default:
      // Acknowledge unhandled events so Razorpay stops retrying
      result = { ok: true, unhandled: event.event };
  }

  if ("error" in result) {
    console.error(`[razorpay-webhook] ${event.event} handler error:`, result.error);
    // Return 200 to prevent Razorpay from retrying for application-level errors
    // (signature errors above already returned 403)
  }

  return NextResponse.json(result);
}
