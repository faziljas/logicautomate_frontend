// POST /api/whatsapp/send — internal route called after booking confirmation
import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";
import {
  sendBookingConfirmation,
  sendFeedbackRequest,
  type BookingForMessage,
} from "@/lib/whatsapp/meta-client";
import { getBusinessConfig } from "@/lib/templates/utils";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  const { bookingId, type = "confirmation" } = await request.json();
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

  const supabase = getAdmin();

  const { data: row } = await supabase
    .from("bookings")
    .select(`
      id, business_id, total_amount, advance_paid,
      booking_date, booking_time, duration_minutes,
      custom_data,
      customers(name, phone),
      services(name),
      staff(users(name)),
      businesses(name, address, phone, slug, google_review_link, created_at, subscription_tier)
    `)
    .eq("id", bookingId)
    .single();

  if (!row) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // ── Check WhatsApp trial period for free tier ────────────
  const businessId = row.business_id;
  const businessCreatedAt = (row as { businesses?: { created_at?: string } }).businesses?.created_at;
  const businessTier = (row as { businesses?: { subscription_tier?: string } }).businesses?.subscription_tier;
  const { isFreeTier, isInWhatsAppTrial } = await import("@/lib/plan-limits");
  
  if (isFreeTier(businessTier) && !isInWhatsAppTrial(businessCreatedAt, businessTier)) {
    // Trial expired - log this attempt so it shows in WhatsApp logs
    const customerPhone = (row as { customers?: { phone?: string } }).customers?.phone ?? "";
    if (customerPhone) {
      await supabase.from("whatsapp_logs").insert({
        business_id: businessId,
        booking_id: bookingId,
        customer_phone: customerPhone,
        message_type: type === "feedback" ? "feedback_request" : "booking_confirmation",
        template_used: type === "feedback" ? "feedback_request" : "booking_confirmation",
        message_body: "(blocked — WhatsApp trial expired)",
        status: "failed",
        error_message: "WhatsApp trial expired. Upgrade to Pro for WhatsApp confirmations.",
        error_code: "TRIAL_EXPIRED",
        sent_at: new Date().toISOString(),
      });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: "WhatsApp trial expired. Upgrade to Pro for WhatsApp confirmations.",
      logId: null,
      messageSid: null,
    }, { status: 403 });
  }

  const bookerName = (row as { custom_data?: { customer_name?: string } })?.custom_data?.customer_name;
  const booking: BookingForMessage = {
    id: row.id, business_id: row.business_id,
    customer_name:  bookerName ?? (row as any).customers?.name ?? "Customer",
    customer_phone: (row as any).customers?.phone   ?? "",
    service_name:   (row as any).services?.name     ?? "Service",
    staff_name:     (row as any).staff?.users?.name ?? "Staff",
    booking_date: row.booking_date, booking_time: row.booking_time,
    duration_minutes: row.duration_minutes, total_amount: row.total_amount,
    advance_paid: row.advance_paid,
    business_name:    (row as any).businesses?.name    ?? "",
    business_address: (row as any).businesses?.address ?? "",
    business_phone:   (row as any).businesses?.phone   ?? "",
    business_slug:    (row as any).businesses?.slug    ?? "",
    google_review_link: (row as any).businesses?.google_review_link ?? "",
  };

  const config = await getBusinessConfig(row.business_id);
  if (!config) return NextResponse.json({ error: "Business config not found" }, { status: 404 });

  const result = type === "feedback"
    ? await sendFeedbackRequest(booking, config)
    : await sendBookingConfirmation(booking, config);

  // If failed and retry_count < 3, schedule retry (non-blocking)
  if (!result.success && result.logId) {
    // Trigger retry asynchronously after a delay
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
    if (baseUrl) {
      setTimeout(() => {
        fetch(`${baseUrl}/api/whatsapp/retry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logId: result.logId }),
        }).catch((err) => console.error("[whatsapp/send] Retry trigger failed:", err));
      }, 5000); // Retry after 5 seconds
    }
  }

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
