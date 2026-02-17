// ============================================================
// BookFlow — Meta WhatsApp Cloud API Client
// lib/whatsapp/meta-client.ts
// Replaces Twilio for WhatsApp messaging.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import {
  renderBusinessTemplate,
  type TemplateVariables,
} from "./template-renderer";
import type { TemplateConfig, WhatsAppTemplates } from "@/lib/templates/types";
import { validatePhone } from "@/lib/phone-utils";

export interface SendResult {
  success: boolean;
  messageSid: string | null;
  error?: string;
  logId?: string;
}

export interface SendOptions {
  businessId: string;
  to: string;
  messageType: keyof WhatsAppTemplates | "custom";
  variables: TemplateVariables;
  config: TemplateConfig;
  bookingId?: string;
  templateUsed?: string;
  customMessage?: string;
}

export interface BookingForMessage {
  id: string;
  business_id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  staff_name: string;
  booking_date: string;
  booking_time: string;
  duration_minutes: number;
  total_amount: number;
  advance_paid: number;
  business_name: string;
  business_address?: string;
  business_phone?: string;
  business_slug?: string;
  google_review_link?: string;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export function validatePhoneNumber(phone: string): {
  valid: boolean;
  formatted: string;
  error?: string;
} {
  const result = validatePhone(phone.replace(/^whatsapp:/, ""), "IN");
  if (!result.valid) {
    return { valid: false, formatted: "", error: result.error };
  }
  return { valid: true, formatted: result.e164 };
}

/** Meta requires template messages for proactive/business-initiated messages. Text only works within 24h of customer reply. */
async function sendViaMeta(
  phone: string,
  text: string,
  options?: { useTemplate?: boolean; templateName?: string; templateParams?: string[] }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_PHONE_ID;
  if (!token || !phoneId) {
    return { success: false, error: "META_WHATSAPP_TOKEN or META_PHONE_ID not configured" };
  }

  const to = phone.replace(/\D/g, "");
  const url = `https://graph.facebook.com/v22.0/${phoneId}/messages`;
  const templateName = options?.templateName ?? process.env.META_TEMPLATE_NAME ?? "hello_world";
  const useTemplate = options?.useTemplate ?? process.env.META_USE_TEMPLATE !== "false";

  let body: Record<string, unknown>;

  if (useTemplate) {
    const template: Record<string, unknown> = {
      name: templateName,
      language: { code: process.env.META_TEMPLATE_LANGUAGE ?? "en_US" },
    };
    const params = options?.templateParams;
    if (params && params.length > 0) {
      template.components = [
        {
          type: "body",
          parameters: params.map((p) => ({ type: "text", text: String(p) })),
        },
      ];
    }
    body = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template,
    };
  } else {
    body = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as { messages?: Array<{ id: string }>; error?: { message?: string } };

  if (!res.ok) {
    const errMsg = data?.error?.message ?? res.statusText;
    console.error("[WhatsApp] Meta API error:", { status: res.status, error: data });
    return { success: false, error: errMsg };
  }

  return { success: true, messageId: data?.messages?.[0]?.id };
}

async function logMessage(
  supabase: ReturnType<typeof getSupabase>,
  data: {
    businessId: string;
    bookingId?: string;
    customerPhone: string;
    messageType: string;
    templateUsed: string;
    messageBody: string;
    status: "sent" | "delivered" | "failed";
    providerId?: string;
  }
): Promise<string | undefined> {
  const { data: log } = await supabase
    .from("whatsapp_logs")
    .insert({
      business_id: data.businessId,
      booking_id: data.bookingId ?? null,
      customer_phone: data.customerPhone,
      message_type: data.messageType as never,
      template_used: data.templateUsed,
      message_body: data.messageBody,
      status: data.status,
      provider_id: data.providerId ?? null,
      sent_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  return log?.id;
}

export async function sendWhatsApp(options: SendOptions): Promise<SendResult> {
  const { businessId, to, messageType, variables, config, bookingId, customMessage } = options;
  const supabase = getSupabase();

  const phoneCheck = validatePhoneNumber(to);
  if (!phoneCheck.valid) {
    await logMessage(supabase, {
      businessId,
      bookingId,
      customerPhone: to,
      messageType: messageType as string,
      templateUsed: String(options.templateUsed ?? messageType),
      messageBody: "(send failed — invalid phone)",
      status: "failed",
    });
    return { success: false, messageSid: null, error: phoneCheck.error };
  }

  let messageBody: string;

  if (messageType === "custom" && customMessage) {
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

  const templateName = process.env.META_TEMPLATE_NAME ?? "hello_world";
  const templateParams =
    templateName !== "hello_world" && options.variables
      ? [
          options.variables.customer_name ?? "Customer",
          options.variables.service_name ?? "Service",
          options.variables.date ?? "",
          options.variables.time ?? "",
          options.variables.business_name ?? "",
        ].filter(Boolean)
      : undefined;

  let messageSid: string | null = null;
  let sendError: string | undefined;
  let status: "sent" | "failed" = "sent";

  // META_USE_TEMPLATE=false → use "text" (works within 24h of customer message — "Lazy Developer Trick")
  const metaResult = await sendViaMeta(phoneCheck.formatted, messageBody, {
    useTemplate: process.env.META_USE_TEMPLATE !== "false",
    templateName,
    templateParams,
  });

  if (!metaResult.success) {
    sendError = metaResult.error;
    status = "failed";
  } else {
    messageSid = metaResult.messageId ?? null;
  }

  const logId = await logMessage(supabase, {
    businessId,
    bookingId,
    customerPhone: to,
    messageType: messageType as string,
    templateUsed: String(options.templateUsed ?? messageType),
    messageBody,
    status,
    providerId: messageSid ?? undefined,
  });

  if (status === "failed") {
    return { success: false, messageSid: null, error: sendError, logId };
  }

  return { success: true, messageSid, logId };
}

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://logicautomate.app").replace(/\/+$/, "");
}

function buildBookingVariables(b: BookingForMessage): TemplateVariables {
  const appUrl = getAppUrl();
  return {
    customer_name: b.customer_name,
    customer_phone: b.customer_phone,
    service_name: b.service_name,
    staff_name: b.staff_name,
    date: b.booking_date,
    time: b.booking_time,
    duration_mins: b.duration_minutes,
    business_name: b.business_name,
    business_address: b.business_address ?? "",
    business_phone: b.business_phone ?? "",
    advance_amount: b.advance_paid,
    remaining_amount: b.total_amount - b.advance_paid,
    total_amount: b.total_amount,
    cancellation_link: `${appUrl}/booking/${b.id}`,
    visit_count: 1,
  };
}

export async function sendBookingConfirmation(
  booking: BookingForMessage,
  config: TemplateConfig
): Promise<SendResult> {
  return sendWhatsApp({
    businessId: booking.business_id,
    to: booking.customer_phone,
    messageType: "confirmation",
    bookingId: booking.id,
    templateUsed: "confirmation",
    config,
    variables: buildBookingVariables(booking),
  });
}

export async function send24hReminder(
  booking: BookingForMessage,
  config: TemplateConfig
): Promise<SendResult> {
  return sendWhatsApp({
    businessId: booking.business_id,
    to: booking.customer_phone,
    messageType: "reminder_24h",
    bookingId: booking.id,
    templateUsed: "reminder_24h",
    config,
    variables: buildBookingVariables(booking),
  });
}

export async function send2hReminder(
  booking: BookingForMessage,
  config: TemplateConfig
): Promise<SendResult> {
  return sendWhatsApp({
    businessId: booking.business_id,
    to: booking.customer_phone,
    messageType: "reminder_2h",
    bookingId: booking.id,
    templateUsed: "reminder_2h",
    config,
    variables: buildBookingVariables(booking),
  });
}

export async function sendNoShowFollowup(
  booking: BookingForMessage,
  config: TemplateConfig
): Promise<SendResult> {
  return sendWhatsApp({
    businessId: booking.business_id,
    to: booking.customer_phone,
    messageType: "no_show_followup",
    bookingId: booking.id,
    templateUsed: "no_show_followup",
    config,
    variables: buildBookingVariables(booking),
  });
}

export async function sendFeedbackRequest(
  booking: BookingForMessage,
  config: TemplateConfig
): Promise<SendResult> {
  const appUrl = getAppUrl();
  return sendWhatsApp({
    businessId: booking.business_id,
    to: booking.customer_phone,
    messageType: "feedback",
    bookingId: booking.id,
    templateUsed: "feedback",
    config,
    variables: {
      ...buildBookingVariables(booking),
      rating_link: `${appUrl}/rate/${booking.id}`,
      google_review_link: booking.google_review_link ?? "",
    },
  });
}

export async function sendLoyaltyReward(
  booking: BookingForMessage,
  config: TemplateConfig,
  visitCount: number
): Promise<SendResult> {
  const appUrl = getAppUrl();
  const slug = booking.business_slug ?? "";
  return sendWhatsApp({
    businessId: booking.business_id,
    to: booking.customer_phone,
    messageType: "loyalty_reward",
    bookingId: booking.id,
    templateUsed: "loyalty_reward",
    config,
    variables: {
      ...buildBookingVariables(booking),
      visit_count: String(visitCount),
      booking_link: `${appUrl}/${slug}`,
    },
  });
}
