// ============================================================
// POST /api/webhooks/twilio
// Receives Twilio delivery-status callbacks for WhatsApp messages.
//
// Twilio posts application/x-www-form-urlencoded with fields:
//   MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage
//
// Statuses (in order):  queued → sent → delivered → read
//                       queued → sent → undelivered / failed
//
// Security: validate X-Twilio-Signature to ensure the request
//           genuinely comes from Twilio.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";
import twilio                        from "twilio";

// ── Supabase admin client (bypasses RLS) ─────────────────────
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ── Twilio signature validation ───────────────────────────────
function validateTwilioSignature(request: NextRequest, body: string): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.warn("[twilio-webhook] TWILIO_AUTH_TOKEN not set — skipping signature check");
    return true; // Allow in dev; harden in production
  }

  const signature  = request.headers.get("x-twilio-signature") ?? "";
  const requestUrl = process.env.TWILIO_WEBHOOK_URL
    ?? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`;

  // Parse body to key-value pairs Twilio uses for HMAC computation
  const params: Record<string, string> = {};
  new URLSearchParams(body).forEach((value, key) => { params[key] = value; });

  try {
    return twilio.validateRequest(authToken, signature, requestUrl, params);
  } catch {
    return false;
  }
}

// ── Map Twilio status → our DB enum ──────────────────────────
type TwilioStatus =
  | "queued" | "sending" | "sent"
  | "delivered" | "read"
  | "undelivered" | "failed";

function mapStatus(twilioStatus: string): string {
  const map: Record<TwilioStatus, string> = {
    queued:      "pending",
    sending:     "sent",
    sent:        "sent",
    delivered:   "delivered",
    read:        "read",
    undelivered: "undelivered",
    failed:      "failed",
  };
  return map[twilioStatus as TwilioStatus] ?? "sent";
}

// ── Handler ───────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Validate Twilio signature
  if (!validateTwilioSignature(request, rawBody)) {
    console.warn("[twilio-webhook] Invalid signature — request rejected");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params      = new URLSearchParams(rawBody);
  const messageSid  = params.get("MessageSid");
  const rawStatus   = params.get("MessageStatus") ?? "";
  const errorCode   = params.get("ErrorCode")   ?? null;
  const errorMsg    = params.get("ErrorMessage") ?? null;

  if (!messageSid) {
    return NextResponse.json({ error: "Missing MessageSid" }, { status: 400 });
  }

  const dbStatus = mapStatus(rawStatus);
  const now      = new Date().toISOString();

  // Build the update payload
  const update: Record<string, unknown> = { status: dbStatus };

  if (dbStatus === "delivered")   update.delivered_at  = now;
  if (dbStatus === "read")        { update.delivered_at = now; update.read_at = now; }
  if (dbStatus === "failed" || dbStatus === "undelivered") {
    update.failed_at      = now;
    update.error_code     = errorCode;
    update.error_message  = errorMsg;
  }

  const supabase = getAdmin();

  const { error } = await supabase
    .from("whatsapp_logs")
    .update(update)
    .eq("twilio_message_sid", messageSid);

  if (error) {
    // Log but don't return 500 — Twilio retries on non-2xx
    console.error("[twilio-webhook] DB update failed:", error.message, { messageSid });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[twilio-webhook] ${messageSid} → ${dbStatus}`);

  // Twilio expects a 2xx response (body is ignored)
  return new NextResponse(null, { status: 204 });
}

// Twilio sends GET to verify the endpoint is reachable in some configs
export async function GET() {
  return NextResponse.json({ ok: true, service: "twilio-webhook" });
}
