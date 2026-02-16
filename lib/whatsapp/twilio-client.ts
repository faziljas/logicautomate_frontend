// ============================================================
// BookFlow — Twilio WhatsApp Client
// lib/whatsapp/twilio-client.ts
// ============================================================

import twilio                from "twilio";
import { createClient }      from "@supabase/supabase-js";
import {
  renderBusinessTemplate,
  renderTemplate,
  type TemplateVariables,
} from "./template-renderer";
import type { TemplateConfig, WhatsAppTemplates } from "@/lib/templates/types";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export interface SendResult {
  success:    boolean;
  messageSid: string | null;
  error?:     string;
  logId?:     string;
}

export interface SendOptions {
  businessId:  string;
  to:          string;           // customer phone (with or without whatsapp: prefix)
  messageType: keyof WhatsAppTemplates | "custom";
  variables:   TemplateVariables;
  config:      TemplateConfig;
  bookingId?:  string;
  templateUsed?: string;
  // For custom/manual messages
  customMessage?: string;
}

// ─────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────
function getTwilioClient() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
  return twilio(sid, token);
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function getFromNumber(): string {
  const num = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!num) throw new Error("Missing TWILIO_WHATSAPP_NUMBER");
  return num.startsWith("whatsapp:") ? num : `whatsapp:${num}`;
}

// ─────────────────────────────────────────
// PHONE VALIDATION
// ─────────────────────────────────────────

/**
 * Normalises a phone number to WhatsApp-compatible E.164 format.
 * "+919876543210"  → "whatsapp:+919876543210"
 * "9876543210"     → "whatsapp:+919876543210" (assumes India)
 * "whatsapp:+91..."→ unchanged
 */
export function validatePhoneNumber(phone: string): {
  valid:      boolean;
  formatted:  string;
  error?:     string;
} {
  if (!phone) return { valid: false, formatted: "", error: "Phone is required" };

  let cleaned = phone.trim().replace(/\s+/g, "");

  // Strip existing whatsapp: prefix for processing
  if (cleaned.startsWith("whatsapp:")) cleaned = cleaned.slice(9);

  // Add country code if missing (India default)
  if (/^[6-9]\d{9}$/.test(cleaned)) cleaned = `+91${cleaned}`;

  // Must be E.164: + followed by 7–15 digits
  if (!/^\+\d{7,15}$/.test(cleaned)) {
    return { valid: false, formatted: "", error: `Invalid phone number: ${phone}` };
  }

  return { valid: true, formatted: `whatsapp:${cleaned}` };
}

// ─────────────────────────────────────────
// SEND WHATSAPP MESSAGE
// ─────────────────────────────────────────

/**
 * Sends a WhatsApp message via Twilio and logs it to whatsapp_logs.
 * Handles template rendering, phone validation, and error logging.
 */
export async function sendWhatsApp(options: SendOptions): Promise<SendResult> {
  const { businessId, to, messageType, variables, config, bookingId, customMessage } = options;
  const supabase = getSupabase();

  // ── 1. Validate phone ────────────────────────────────────
  const phoneCheck = validatePhoneNumber(to);
  if (!phoneCheck.valid) {
    await logMessage(supabase, {
      businessId, bookingId, customerPhone: to,
      messageType: messageType as string,
      templateUsed: String(options.templateUsed ?? messageType),
      messageBody:  "(send failed — invalid phone)",
      status:       "failed",
    });
    return { success: false, messageSid: null, error: phoneCheck.error };
  }

  // ── 2. Render message body ───────────────────────────────
  let messageBody: string;

  if (messageType === "custom" && customMessage) {
    // Manual promotional message
    messageBody = customMessage;
  } else {
    const rendered = renderBusinessTemplate(
      messageType as keyof WhatsAppTemplates,
      config,
      variables
    );

    if (!rendered) {
      return {
        success: false,
        messageSid: null,
        error: `No template configured for message type: ${messageType}`,
      };
    }

    if (rendered.hasUnresolved) {
      console.warn(
        `[WhatsApp] Template "${messageType}" has unresolved vars:`,
        rendered.missingVars
      );
    }

    messageBody = rendered.message;
  }

  // ── 3. Send via Twilio ───────────────────────────────────
  const fromNumber = getFromNumber();
  let messageSid: string | null = null;
  let sendError:  string | undefined;
  let status: "sent" | "failed" = "sent";

  try {
    const client  = getTwilioClient();
    const message = await client.messages.create({
      from: fromNumber,
      to:   phoneCheck.formatted,
      body: messageBody,
    });
    messageSid = message.sid;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp] Send failed to ${phoneCheck.formatted}:`, msg);
    sendError = msg;
    status    = "failed";
  }

  // ── 4. Log to DB ─────────────────────────────────────────
  const logId = await logMessage(supabase, {
    businessId,
    bookingId,
    customerPhone: to,
    messageType:   messageType as string,
    templateUsed:  String(options.templateUsed ?? messageType),
    messageBody,
    status,
    providerId: messageSid ?? undefined,
  });

  if (status === "failed") {
    return { success: false, messageSid: null, error: sendError, logId };
  }

  return { success: true, messageSid, logId };
}

// ─────────────────────────────────────────
// LOG HELPER
// ─────────────────────────────────────────
async function logMessage(
  supabase:     ReturnType<typeof getSupabase>,
  data: {
    businessId:    string;
    bookingId?:    string;
    customerPhone: string;
    messageType:   string;
    templateUsed:  string;
    messageBody:   string;
    status:        "sent" | "delivered" | "failed";
    providerId?:   string;
  }
): Promise<string | undefined> {
  const { data: log } = await supabase
    .from("whatsapp_logs")
    .insert({
      business_id:    data.businessId,
      booking_id:     data.bookingId ?? null,
      customer_phone: data.customerPhone,
      message_type:   data.messageType as any,
      template_used:  data.templateUsed,
      message_body:   data.messageBody,
      status:         data.status,
      provider_id:    data.providerId ?? null,
      sent_at:        new Date().toISOString(),
    })
    .select("id")
    .single();

  return log?.id;
}

// ─────────────────────────────────────────
// CONVENIENCE SENDERS
// ─────────────────────────────────────────

/** Send booking confirmation after payment */
export async function sendBookingConfirmation(
  booking: BookingForMessage,
  config:  TemplateConfig
): Promise<SendResult> {
  return sendWhatsApp({
    businessId:  booking.business_id,
    to:          booking.customer_phone,
    messageType: "confirmation",
    bookingId:   booking.id,
    templateUsed: "confirmation",
    config,
    variables: buildBookingVariables(booking),
  });
}

/** Send 24-hour reminder */
export async function send24hReminder(
  booking: BookingForMessage,
  config:  TemplateConfig
): Promise<SendResult> {
  return sendWhatsApp({
    businessId:  booking.business_id,
    to:          booking.customer_phone,
    messageType: "reminder_24h",
    bookingId:   booking.id,
    templateUsed: "reminder_24h",
    config,
    variables: buildBookingVariables(booking),
  });
}

/** Send 2-hour reminder */
export async function send2hReminder(
  booking: BookingForMessage,
  config:  TemplateConfig
): Promise<SendResult> {
  return sendWhatsApp({
    businessId:  booking.business_id,
    to:          booking.customer_phone,
    messageType: "reminder_2h",
    bookingId:   booking.id,
    templateUsed: "reminder_2h",
    config,
    variables: buildBookingVariables(booking),
  });
}

/** Send no-show follow-up */
export async function sendNoShowFollowup(
  booking: BookingForMessage,
  config:  TemplateConfig
): Promise<SendResult> {
  return sendWhatsApp({
    businessId:  booking.business_id,
    to:          booking.customer_phone,
    messageType: "no_show_followup",
    bookingId:   booking.id,
    templateUsed: "no_show_followup",
    config,
    variables: buildBookingVariables(booking),
  });
}

/** Send post-service feedback request */
export async function sendFeedbackRequest(
  booking: BookingForMessage,
  config:  TemplateConfig
): Promise<SendResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bookflow.app";
  return sendWhatsApp({
    businessId:  booking.business_id,
    to:          booking.customer_phone,
    messageType: "feedback",
    bookingId:   booking.id,
    templateUsed: "feedback",
    config,
    variables: {
      ...buildBookingVariables(booking),
      rating_link:       `${appUrl}/rate/${booking.id}`,
      google_review_link: booking.google_review_link ?? "",
    },
  });
}

/** Send loyalty reward notification */
export async function sendLoyaltyReward(
  booking:    BookingForMessage,
  config:     TemplateConfig,
  visitCount: number
): Promise<SendResult> {
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://bookflow.app";
  const slug     = booking.business_slug ?? "";
  return sendWhatsApp({
    businessId:  booking.business_id,
    to:          booking.customer_phone,
    messageType: "loyalty_reward",
    bookingId:   booking.id,
    templateUsed: "loyalty_reward",
    config,
    variables: {
      ...buildBookingVariables(booking),
      visit_count:  visitCount,
      booking_link: `${appUrl}/${slug}`,
    },
  });
}

// ─────────────────────────────────────────
// BOOKING DATA SHAPE for message sending
// ─────────────────────────────────────────
export interface BookingForMessage {
  id:               string;
  business_id:      string;
  customer_name:    string;
  customer_phone:   string;
  service_name:     string;
  staff_name:       string;
  booking_date:     string;   // YYYY-MM-DD
  booking_time:     string;   // HH:MM
  duration_minutes: number;
  total_amount:     number;
  advance_paid:     number;
  business_name:    string;
  business_address?: string;
  business_phone?:   string;
  business_slug?:    string;
  google_review_link?: string;
}

function buildBookingVariables(b: BookingForMessage): TemplateVariables {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bookflow.app";
  return {
    customer_name:    b.customer_name,
    service_name:     b.service_name,
    staff_name:       b.staff_name,
    date:             b.booking_date,
    time:             b.booking_time,
    duration_mins:    b.duration_minutes,
    business_name:    b.business_name,
    business_address: b.business_address ?? "",
    business_phone:   b.business_phone ?? "",
    advance_amount:   b.advance_paid,
    remaining_amount: b.total_amount - b.advance_paid,
    total_amount:     b.total_amount,
    cancellation_link: `${appUrl}/cancel/${b.id}`,
  };
}
