// GET /api/staff/schedule — Today's bookings for logged-in staff (JWT)
import { NextRequest } from "next/server";
import { getStaffFromRequest, getAdminClient } from "@/lib/staff-auth";
import { jsonResponse, unauthorized } from "@/lib/dashboard/api-helpers";

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  const payload = getStaffFromRequest(request);
  if (!payload) return unauthorized();

  const supabase = getAdminClient();
  const today = getTodayDateString();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id, booking_date, booking_time, duration_minutes, end_time,
      status, total_amount, advance_paid, special_requests,
      customers(id, name, phone, email),
      services(id, name, duration_minutes, price),
      staff(id, users(name), role_name)
    `)
    .eq("staff_id", payload.sub)
    .eq("business_id", payload.businessId)
    .eq("booking_date", today)
    .in("status", ["pending", "confirmed", "completed", "cancelled", "no_show"])
    .order("booking_time", { ascending: true });

  if (error) {
    console.error("[staff/schedule]", error);
    return jsonResponse({ error: "Failed to fetch schedule" }, { status: 500 });
  }

  return jsonResponse({ bookings: bookings ?? [] });
}
