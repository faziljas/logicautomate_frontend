// POST /api/whatsapp/send — internal route called after booking confirmation
import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";
import {
  sendBookingConfirmation,
  sendFeedbackRequest,
  type BookingForMessage,
} from "@/lib/whatsapp/twilio-client";
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
      businesses(name, address, phone, slug, google_review_link)
    `)
    .eq("id", bookingId)
    .single();

  if (!row) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

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

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
