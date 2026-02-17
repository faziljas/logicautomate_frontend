// GET /api/staff/profile — Staff stats (today/week/month) and profile
import { NextRequest } from "next/server";
import { getStaffFromRequest, getAdminClient } from "@/lib/staff-auth";
import { jsonResponse, unauthorized } from "@/lib/dashboard/api-helpers";

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}
function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}
function getMonthStart(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  const payload = getStaffFromRequest(request);
  if (!payload) return unauthorized();

  const supabase = getAdminClient();
  const today = getTodayDateString();
  const weekStart = getWeekStart();
  const monthStart = getMonthStart();

  const { data: staffRow } = await supabase
    .from("staff")
    .select("id, role_name, working_hours, rating, total_reviews, bio")
    .eq("id", payload.sub)
    .single();

  if (!staffRow) {
    return jsonResponse({ error: "Staff not found" }, { status: 404 });
  }

  const { data: todayBookings } = await supabase
    .from("bookings")
    .select("id, status, total_amount")
    .eq("staff_id", payload.sub)
    .eq("booking_date", today);

  const { data: weekBookings } = await supabase
    .from("bookings")
    .select("id, status, total_amount")
    .eq("staff_id", payload.sub)
    .gte("booking_date", weekStart)
    .lte("booking_date", today);

  const { data: monthBookings } = await supabase
    .from("bookings")
    .select("id, status, total_amount")
    .eq("staff_id", payload.sub)
    .gte("booking_date", monthStart)
    .lte("booking_date", today);

  const completed = (arr: { status: string; total_amount?: number }[] | null) =>
    (arr || []).filter((b) => b.status === "completed");
  const revenue = (arr: { total_amount?: number }[]) =>
    arr.reduce((s, b) => s + Number(b.total_amount || 0), 0);

  const todayCompleted = completed(todayBookings ?? []);
  const weekCompleted = completed(weekBookings ?? []);
  const monthCompleted = completed(monthBookings ?? []);

  const { count: totalCompletedCount } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("staff_id", payload.sub)
    .eq("status", "completed");
  const hasHandledCustomers = (totalCompletedCount ?? 0) > 0;

  return jsonResponse({
    staff: staffRow,
    stats: {
      today: { servicesCompleted: todayCompleted.length, revenue: revenue(todayCompleted) },
      week: { servicesCompleted: weekCompleted.length, revenue: revenue(weekCompleted) },
      month: { servicesCompleted: monthCompleted.length, revenue: revenue(monthCompleted) },
    },
    rating: staffRow.rating,
    totalReviews: staffRow.total_reviews,
    hasHandledCustomers,
  });
}
