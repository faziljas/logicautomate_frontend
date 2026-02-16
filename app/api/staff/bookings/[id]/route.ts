// GET /api/staff/bookings/:id — Single booking details for staff
import { NextRequest } from "next/server";
import { getStaffFromRequest, getAdminClient } from "@/lib/staff-auth";
import { jsonResponse, unauthorized, badRequest } from "@/lib/dashboard/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getStaffFromRequest(request);
  if (!payload) return unauthorized();

  const { id } = await params;
  if (!id) return badRequest("Booking ID required");

  const supabase = getAdminClient();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      id, booking_date, booking_time, duration_minutes, end_time,
      status, total_amount, advance_paid, special_requests,
      custom_data, created_at,
      customers(id, name, phone, email, notes),
      services(id, name, duration_minutes, price),
      staff(id, users(name), role_name)
    `)
    .eq("id", id)
    .eq("staff_id", payload.sub)
    .single();

  if (error || !booking) {
    return jsonResponse({ error: "Booking not found" }, { status: 404 });
  }

  return jsonResponse({ booking });
}
