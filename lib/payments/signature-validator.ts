// ============================================================
// lib/payments/signature-validator.ts
// HMAC-SHA256 signature helpers for Razorpay
//
// 1. Payment signature  — produced by Razorpay checkout SDK
//    HMAC( key_secret, "<order_id>|<razorpay_payment_id>" )
//
// 2. Webhook signature  — sent as X-Razorpay-Signature header
//    HMAC( webhook_secret, raw-request-body )
// ============================================================

import crypto from "crypto";

// ── Payment signature ─────────────────────────────────────────
/**
 * Verify the signature returned by Razorpay checkout on the frontend.
 * Should be called server-side before marking a booking as confirmed.
 */
export function verifyPaymentSignature(
  orderId:   string,
  paymentId: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET is not configured");

  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  // Constant-time compare to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false; // Length mismatch → invalid
  }
}

// ── Webhook signature ─────────────────────────────────────────
/**
 * Verify the X-Razorpay-Signature header on incoming webhook requests.
 * @param rawBody  Raw request body as a string (before JSON.parse)
 * @param signature  Value of X-Razorpay-Signature header
 */
export function verifyWebhookSignature(
  rawBody:   string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

// ── Amount validation ─────────────────────────────────────────
/**
 * Validates that the amount paid matches the expected amount.
 * Razorpay amounts are in the smallest currency unit (paise for INR).
 */
export function validateAmount(
  paidPaise:     number,
  expectedRupees: number,
): boolean {
  return paidPaise === Math.round(expectedRupees * 100);
}

/** Convert rupees to paise (integer) */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Convert paise to rupees */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}
