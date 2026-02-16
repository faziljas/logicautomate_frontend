// ============================================================
// lib/payments/razorpay-client.ts
// Thin wrapper around the Razorpay Node SDK.
//
// All monetary amounts stored in this codebase are in RUPEES.
// Razorpay API expects PAISE — conversion is done here.
// ============================================================

import Razorpay from "razorpay";
import { rupeesToPaise, paiseToRupees } from "./signature-validator";

// ── Razorpay client singleton ─────────────────────────────────
let _client: Razorpay | null = null;

function getClient(): Razorpay {
  if (_client) return _client;

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
  }

  _client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return _client;
}

// ── Types ─────────────────────────────────────────────────────
export interface CreateOrderOptions {
  /** Advance amount in RUPEES */
  amountRupees: number;
  bookingId:    string;
  currency?:    string; // default: INR
  notes?:       Record<string, string>;
}

export interface OrderResult {
  orderId:      string;
  amountPaise:  number;
  amountRupees: number;
  currency:     string;
  receipt:      string;
  status:       string;
}

export interface RefundOptions {
  paymentId:     string;
  /** Amount to refund in RUPEES. Omit for full refund. */
  amountRupees?: number;
  notes?:        Record<string, string>;
  speed?:        "normal" | "optimum"; // optimum = instant if possible
}

export interface RefundResult {
  refundId:     string;
  amountPaise:  number;
  amountRupees: number;
  status:       string;
  speed:        string;
}

export interface PaymentDetails {
  id:           string;
  orderId:      string;
  amountPaise:  number;
  amountRupees: number;
  currency:     string;
  status:       string;   // created | authorized | captured | refunded | failed
  method:       string;   // card | netbanking | upi | wallet | emi
  email:        string;
  contact:      string;
  description:  string;
  capturedAt:   string | null;
  notes:        Record<string, string>;
  errorCode:    string | null;
  errorDesc:    string | null;
}

// ── createOrder ───────────────────────────────────────────────
/**
 * Creates a Razorpay order for advance payment.
 * The booking ID is stored as the receipt for reconciliation.
 */
export async function createOrder(
  options: CreateOrderOptions,
): Promise<OrderResult> {
  const { amountRupees, bookingId, currency = "INR", notes = {} } = options;

  if (amountRupees <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const rz = getClient();

  const order = await rz.orders.create({
    amount:   rupeesToPaise(amountRupees),
    currency,
    receipt:  `bk_${bookingId}`.slice(0, 40), // max 40 chars
    notes:    { booking_id: bookingId, ...notes },
  });

  return {
    orderId:      order.id,
    amountPaise:  order.amount as number,
    amountRupees: paiseToRupees(order.amount as number),
    currency:     order.currency,
    receipt:      order.receipt ?? "",
    status:       order.status,
  };
}

// ── initiateRefund ────────────────────────────────────────────
/**
 * Issues a refund for a captured payment.
 * Pass amountRupees for partial refund; omit for full refund.
 */
export async function initiateRefund(
  options: RefundOptions,
): Promise<RefundResult> {
  const { paymentId, amountRupees, notes = {}, speed = "optimum" } = options;

  const rz = getClient();

  const params: Record<string, unknown> = { speed, notes };
  if (amountRupees !== undefined) {
    params.amount = rupeesToPaise(amountRupees);
  }

  const refund = await rz.payments.refund(paymentId, params);

  const amount = refund.amount ?? 0;
  return {
    refundId:     refund.id,
    amountPaise:  amount,
    amountRupees: paiseToRupees(amount),
    status:       refund.status,
    speed:        (refund as unknown as Record<string, unknown>).speed_processed as string ?? speed,
  };
}

// ── getPaymentDetails ─────────────────────────────────────────
export async function getPaymentDetails(
  paymentId: string,
): Promise<PaymentDetails> {
  const rz = getClient();
  const p  = await rz.payments.fetch(paymentId);

  const amt = typeof p.amount === "number" ? p.amount : Number(p.amount) || 0;
  return {
    id:           p.id,
    orderId:      p.order_id ?? "",
    amountPaise:  amt,
    amountRupees: paiseToRupees(amt),
    currency:     p.currency,
    status:       p.status,
    method:       p.method ?? "unknown",
    email:        p.email  ?? "",
    contact:      String(p.contact ?? ""),
    description:  p.description ?? "",
    capturedAt:   p.captured ? new Date(((p as unknown) as Record<string, unknown>).created_at as number * 1000).toISOString() : null,
    notes:        ((p.notes as unknown) as Record<string, string>) ?? {},
    errorCode:    ((p as unknown) as Record<string, unknown>).error_code as string ?? null,
    errorDesc:    ((p as unknown) as Record<string, unknown>).error_description as string ?? null,
  };
}

// ── verifyPaymentSignature re-export ──────────────────────────
export { verifyPaymentSignature } from "./signature-validator";
