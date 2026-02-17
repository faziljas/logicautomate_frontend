// ============================================================
// POST /api/whatsapp/send-reminder
// Manually trigger reminder for a booking.
// Body: { bookingId }
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  badRequest,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";
import { createClient } from "@supabase/supabase-js";
import { type TemplateVariables } from "@/lib/whatsapp/template-renderer";
import { getBusinessConfig } from "@/lib/templates/utils";
import { sendWhatsApp } from "@/lib/whatsapp/meta-client";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  const { session, business, supabase, error } = await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }

  let body: { bookingId: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const { bookingId } = body;
  if (!bookingId) return badRequest("bookingId required");

  const admin = getAdmin();
  const { data: row } = await admin
    .from("bookings")
    .select(`
      id, business_id, booking_date, booking_time, duration_minutes,
      total_amount, advance_paid, custom_data,
      customers(name, phone),
      services(name),
      staff(users(name)),
      businesses(name, address, phone, slug, google_review_link)
    `)
    .eq("id", bookingId)
    .eq("business_id", business.id)
    .single();

  if (!row) {
    return jsonResponse({ error: "Booking not found" }, { status: 404 });
  }

  const config = await getBusinessConfig(business.id);
  if (!config) {
    return jsonResponse({ error: "Business config not found" }, { status: 404 });
  }

  const bookerName = (row as any).custom_data?.customer_name;
  const vars: TemplateVariables = {
    customer_name: bookerName ?? (row as any).customers?.name ?? "Customer",
    customer_phone: (row as any).customers?.phone ?? "",
    service_name: (row as any).services?.name ?? "Service",
    staff_name: (row as any).staff?.users?.name ?? "Staff",
    date: new Date((row as any).booking_date).toLocaleDateString("en-IN"),
    time: (row as any).booking_time ?? "",
    business_name: (row as any).businesses?.name ?? "",
    business_address: (row as any).businesses?.address ?? "",
    business_phone: (row as any).businesses?.phone ?? "",
    advance_amount: String((row as any).advance_paid ?? 0),
    remaining_amount: String(((row as any).total_amount ?? 0) - ((row as any).advance_paid ?? 0)),
    booking_url: `${process.env.NEXT_PUBLIC_APP_URL}/${(row as any).businesses?.slug}/book`,
    visit_count: "1",
  };

  const to = (row as any).customers?.phone;
  if (!to) {
    return jsonResponse({ error: "Customer has no phone" }, { status: 400 });
  }

  // Check Meta config before attempting send
  if (!process.env.META_WHATSAPP_TOKEN || !process.env.META_PHONE_ID) {
    return jsonResponse(
      { error: "WhatsApp not configured. Add META_WHATSAPP_TOKEN and META_PHONE_ID to Vercel environment variables." },
      { status: 500 }
    );
  }

  try {
    const result = await sendWhatsApp({
      businessId: business.id,
      to,
      messageType: "reminder_24h",
      variables: vars,
      config,
      bookingId,
    });
    if (result.success) {
      return jsonResponse({ success: true, message: "Reminder sent" });
    }
    return jsonResponse(
      { error: result.error ?? "Failed to send" },
      { status: 500 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[send-reminder]", e);
    return jsonResponse(
      { error: `Failed to send reminder: ${msg}` },
      { status: 500 }
    );
  }
}
