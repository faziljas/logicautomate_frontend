// ============================================================
// POST /api/send-reminder
// QStash callback — verifies signature, sends reminder.
// Body: { bookingId, reminderType?: "24h"|"2h" } for WhatsApp + optional email, or { phoneNumber, message } for demo.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getBusinessConfig } from "@/lib/templates/utils";
import { sendWhatsApp } from "@/lib/whatsapp/meta-client";
import type { TemplateVariables } from "@/lib/whatsapp/template-renderer";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function sendWhatsAppMessage(phone: string, _text: string): Promise<{ success: boolean; error?: string }> {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_PHONE_ID;
  if (!token || !phoneId) {
    return { success: false, error: "META_WHATSAPP_TOKEN or META_PHONE_ID not configured" };
  }

  const to = phone.replace(/\D/g, "");
  const url = `https://graph.facebook.com/v22.0/${phoneId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: process.env.META_TEMPLATE_NAME ?? "hello_world",
        language: { code: process.env.META_TEMPLATE_LANGUAGE ?? "en_US" },
      },
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errMsg = (data as { error?: { message?: string } })?.error?.message ?? res.statusText;
    console.error("[send-reminder] Meta API error:", { status: res.status, error: data });
    return { success: false, error: errMsg };
  }

  return { success: true };
}

async function handler(request: NextRequest) {
  let body: { bookingId?: string; reminderType?: "24h" | "2h"; phoneNumber?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Demo mode: phoneNumber + message → send via Meta WhatsApp
  if (body.phoneNumber != null && body.message != null) {
    const result = await sendWhatsAppMessage(body.phoneNumber, body.message);
    if (!result.success) {
      console.error("[send-reminder] Meta send failed:", result.error);
      return NextResponse.json({ error: result.error ?? "Failed to send" }, { status: 500 });
    }
    return NextResponse.json({ success: true, demo: true });
  }

  // Real mode: bookingId → send WhatsApp + optional email
  const { bookingId, reminderType = "24h" } = body;
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId or (phoneNumber + message) required" }, { status: 400 });
  }

  const admin = getAdmin();
  const { data: row } = await admin
    .from("bookings")
    .select(`
      id, business_id, status, booking_date, booking_time, duration_minutes,
      total_amount, advance_paid, custom_data,
      customers(name, phone, email),
      services(name),
      staff(users(name)),
      businesses(name, address, phone, slug, google_review_link, custom_config)
    `)
    .eq("id", bookingId)
    .single();

  if (!row) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const status = (row as { status?: string }).status;
  if (status && !["pending", "confirmed"].includes(status)) {
    return NextResponse.json(
      { error: `Cannot send reminder for ${status} booking. Only pending or confirmed.` },
      { status: 400 }
    );
  }

  const config = await getBusinessConfig((row as { business_id: string }).business_id);
  if (!config) {
    return NextResponse.json({ error: "Business config not found" }, { status: 404 });
  }

  const bookerName = (row as { custom_data?: { customer_name?: string } }).custom_data?.customer_name;
  const vars: TemplateVariables = {
    customer_name: bookerName ?? (row as { customers?: { name?: string } }).customers?.name ?? "Customer",
    customer_phone: (row as { customers?: { phone?: string } }).customers?.phone ?? "",
    service_name: (row as { services?: { name?: string } }).services?.name ?? "Service",
    staff_name: (row as { staff?: { users?: { name?: string } } }).staff?.users?.name ?? "Staff",
    date: new Date((row as { booking_date: string }).booking_date).toLocaleDateString("en-IN"),
    time: (row as { booking_time?: string }).booking_time ?? "",
    business_name: (row as { businesses?: { name?: string } }).businesses?.name ?? "",
    business_address: (row as { businesses?: { address?: string } }).businesses?.address ?? "",
    business_phone: (row as { businesses?: { phone?: string } }).businesses?.phone ?? "",
    advance_amount: String((row as { advance_paid?: number }).advance_paid ?? 0),
    remaining_amount: String(
      ((row as { total_amount?: number }).total_amount ?? 0) -
        ((row as { advance_paid?: number }).advance_paid ?? 0)
    ),
    booking_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${(row as { businesses?: { slug?: string } }).businesses?.slug ?? ""}/book`,
    visit_count: "1",
  };

  const to = (row as { customers?: { phone?: string } }).customers?.phone;
  if (!to) {
    return NextResponse.json({ error: "Customer has no phone" }, { status: 400 });
  }

  const messageType = reminderType === "2h" ? "reminder_2h" : "reminder_24h";
  const notifications = (row as { businesses?: { custom_config?: { notifications?: Record<string, boolean> } } }).businesses?.custom_config?.notifications;
  const emailEnabled = reminderType === "2h" ? notifications?.email_reminder_2h : notifications?.email_reminder_24h;
  const customerEmail = (row as { customers?: { email?: string } }).customers?.email;
  const businessName = (row as { businesses?: { name?: string } }).businesses?.name ?? "";
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "reminders@logicautomate.app";

  // Send email reminder when enabled and Resend is configured
  if (emailEnabled && customerEmail && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const subject = reminderType === "2h"
        ? `Reminder: Your appointment is in 2 hours — ${businessName}`
        : `Reminder: Your appointment is tomorrow — ${businessName}`;
      const text = `Hi ${vars.customer_name},\n\nYour ${vars.service_name} appointment is ${reminderType === "2h" ? "in 2 hours" : "in 24 hours"}.\n\nDate: ${vars.date}\nTime: ${vars.time}\n${businessName}${vars.business_address ? `\n${vars.business_address}` : ""}\n\nSee you soon!`;
      await resend.emails.send({
        from: fromEmail,
        to: customerEmail,
        subject,
        text,
      });
    } catch (e) {
      console.error("[send-reminder] Email failed:", e);
      // Continue; WhatsApp may still succeed
    }
  }

  try {
    const result = await sendWhatsApp({
      businessId: (row as { business_id: string }).business_id,
      to,
      messageType,
      variables: vars,
      config,
      bookingId,
    });
    if (result.success) {
      return NextResponse.json({ success: true, message: "Reminder sent" });
    }
    return NextResponse.json({ error: result.error ?? "Failed to send" }, { status: 500 });
  } catch (e) {
    console.error("[send-reminder]", e);
    return NextResponse.json({ error: "Failed to send reminder" }, { status: 500 });
  }
}

// Use placeholders when keys are missing so build succeeds (e.g. on Vercel where
// env vars may not be available at build time). At runtime, real keys from Vercel
// will be used; if missing, verification fails (403) which is correct.
export const POST = verifySignatureAppRouter(
  handler as (req: NextRequest) => Promise<Response>,
  {
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "build-time-placeholder",
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "build-time-placeholder",
  }
);
