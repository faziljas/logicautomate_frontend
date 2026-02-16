// ============================================================
// GET /api/dashboard/staff
export const dynamic = "force-dynamic";
// List staff with basic metrics. Owner only.
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  badRequest,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";

export async function GET(request: NextRequest) {
  const { session, business, supabase, isOwner, error } = await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }

  if (!isOwner) {
    return jsonResponse({ error: "Owner only" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId || businessId !== business.id) {
    return badRequest("businessId required");
  }

  const { data: staffRows, error: fetchErr } = await supabase
    .from("staff")
    .select(`
      id, role_name, specializations, working_hours, bio, rating, total_reviews, is_active,
      users(id, name, email, phone)
    `)
    .eq("business_id", businessId)
    .order("role_name");

  if (fetchErr) {
    console.error("[dashboard/staff]", fetchErr);
    return jsonResponse({ error: "Failed to fetch" }, { status: 500 });
  }

  // Fetch booking counts per staff
  const staffIds = (staffRows ?? []).map((s: { id: string }) => s.id);
  const today = new Date().toISOString().split("T")[0];

  const { data: todayCounts } = await supabase
    .from("bookings")
    .select("staff_id")
    .eq("business_id", businessId)
    .eq("booking_date", today)
    .in("status", ["pending", "confirmed", "completed"]);

  const countMap: Record<string, number> = {};
  (todayCounts ?? []).forEach((b: { staff_id: string }) => {
    countMap[b.staff_id] = (countMap[b.staff_id] ?? 0) + 1;
  });

  const staff = (staffRows ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    todayBookings: countMap[s.id as string] ?? 0,
  }));

  return jsonResponse({ staff });
}
