// ============================================================
// GET /api/dashboard/today-bookings
// Today's appointments for the overview.
// Query: ?businessId=xxx
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  badRequest,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";
import { getTodayDateString } from "@/lib/dashboard/stats-calculator";

export async function GET(request: NextRequest) {
  const { session, business, supabase, staffId, isOwner, error } =
    await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId || businessId !== business.id) {
    return badRequest("businessId required");
  }

  const today = getTodayDateString();

  let query = supabase
    .from("bookings")
    .select(
      `
      id, booking_date, booking_time, duration_minutes, status,
      total_amount, advance_paid, special_requests,
      customers(id, name, phone, email),
      services(id, name, duration_minutes, price),
      staff(id, users(name), role_name)
    `
    )
    .eq("business_id", businessId)
    .eq("booking_date", today)
    .in("status", ["pending", "confirmed", "completed", "cancelled", "no_show"])
    .order("booking_time", { ascending: true });

  if (!isOwner && staffId) query = query.eq("staff_id", staffId);

  const { data: bookings, error: fetchErr } = await query;

  if (fetchErr) {
    console.error("[dashboard/today-bookings]", fetchErr);
    return jsonResponse({ error: "Failed to fetch" }, { status: 500 });
  }

  return jsonResponse({ bookings: bookings ?? [] });
}
