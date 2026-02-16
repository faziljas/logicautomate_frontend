// ============================================================
// GET /api/dashboard/stats
export const dynamic = "force-dynamic";
// Today's overview stats for the dashboard home.
// Query: ?businessId=xxx
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  badRequest,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";
import {
  calculateTodayStats,
  getTodayDateString,
  getYesterdayDateString,
} from "@/lib/dashboard/stats-calculator";

export async function GET(request: NextRequest) {
  const { session, business, supabase, staffId, isOwner, error } =
    await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId || businessId !== business.id) {
    return badRequest("businessId required and must match your business");
  }

  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  // Today's bookings
  let todayQuery = supabase
    .from("bookings")
    .select("id, total_amount, status, created_at, customer_id")
    .eq("business_id", businessId)
    .eq("booking_date", today);

  if (!isOwner && staffId) {
    todayQuery = todayQuery.eq("staff_id", staffId);
  }
  const { data: todayBookings } = await todayQuery;

  // Yesterday's bookings (for revenue comparison)
  let yesterdayQuery = supabase
    .from("bookings")
    .select("id, total_amount, status")
    .eq("business_id", businessId)
    .eq("booking_date", yesterday);

  if (!isOwner && staffId) {
    yesterdayQuery = yesterdayQuery.eq("staff_id", staffId);
  }
  const { data: yesterdayBookings } = await yesterdayQuery;

  // New customers today (first booking or first customer record)
  const { data: todayNewCustomers } = await supabase
    .from("customers")
    .select("id, created_at")
    .eq("business_id", businessId)
    .gte("created_at", `${today}T00:00:00`)
    .lt("created_at", `${today}T23:59:59`);

  const stats = calculateTodayStats(
    todayBookings ?? [],
    yesterdayBookings ?? [],
    todayNewCustomers ?? [],
    today
  );

  return jsonResponse({ stats });
}
