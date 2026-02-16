// ============================================================
// GET /api/dashboard/staff-utilization
export const dynamic = "force-dynamic";
// Staff busy % for today (owner only).
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
  const { session, business, supabase, isOwner, error } =
    await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }

  if (!isOwner) {
    return jsonResponse({ utilization: [] });
  }

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId || businessId !== business.id) {
    return badRequest("businessId required");
  }

  const today = getTodayDateString();

  const { data: staffRows } = await supabase
    .from("staff")
    .select("id, users(name), role_name, working_hours")
    .eq("business_id", businessId)
    .eq("is_active", true);

  const { data: todayBookings } = await supabase
    .from("bookings")
    .select("staff_id, duration_minutes")
    .eq("business_id", businessId)
    .eq("booking_date", today)
    .in("status", ["pending", "confirmed", "completed"]);

  const staffMinutes: Record<string, number> = {};
  (todayBookings ?? []).forEach((b: { staff_id: string; duration_minutes: number }) => {
    staffMinutes[b.staff_id] = (staffMinutes[b.staff_id] ?? 0) + (b.duration_minutes ?? 0);
  });

  const WORK_DAY_MINUTES = 8 * 60; // 8 hours default
  const utilization = (staffRows ?? []).map((s: unknown) => {
    const row = s as { id: string; users?: { name?: string } | { name?: string }[]; role_name?: string };
    const users = row.users;
    const name = Array.isArray(users) ? users[0]?.name : users?.name;
    const mins = staffMinutes[row.id] ?? 0;
    const pct = Math.min(100, Math.round((mins / WORK_DAY_MINUTES) * 100));
    return {
      staffId: row.id,
      name: name ?? "Staff",
      roleName: row.role_name ?? "Staff",
      busyMinutes: mins,
      utilizationPercent: pct,
    };
  });

  return jsonResponse({ utilization });
}
