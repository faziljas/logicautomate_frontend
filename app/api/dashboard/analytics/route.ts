// ============================================================
// GET /api/dashboard/analytics
export const dynamic = "force-dynamic";
// Analytics data: revenue trend, popular services, retention, peak hours.
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  badRequest,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";

export async function GET(request: NextRequest) {
  const { session, business, supabase, isOwner, error } =
    await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId || businessId !== business.id) {
    return badRequest("businessId required");
  }

  const today = new Date().toISOString().split("T")[0];
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split("T")[0];
  };

  // Last 7 days revenue
  const revenueDates: string[] = [];
  for (let i = 6; i >= 0; i--) revenueDates.push(daysAgo(i));

  const { data: revenueRows } = await supabase
    .from("bookings")
    .select("booking_date, total_amount")
    .eq("business_id", businessId)
    .eq("status", "completed")
    .in("booking_date", revenueDates);

  const revenueByDate: Record<string, number> = {};
  revenueDates.forEach((d) => (revenueByDate[d] = 0));
  (revenueRows ?? []).forEach((r: { booking_date: string; total_amount: number }) => {
    revenueByDate[r.booking_date] = (revenueByDate[r.booking_date] ?? 0) + Number(r.total_amount);
  });

  const revenueTrend = revenueDates.map((d) => ({
    date: d,
    amount: revenueByDate[d] ?? 0,
  }));

  // Popular services (last 30 days)
  const thirtyDaysAgo = daysAgo(30);
  const { data: serviceCounts } = await supabase
    .from("bookings")
    .select("service_id, services(name)")
    .eq("business_id", businessId)
    .gte("booking_date", thirtyDaysAgo)
    .in("status", ["completed", "confirmed"]);

  const countMap: Record<string, { name: string; count: number }> = {};
  (serviceCounts ?? []).forEach((r: unknown) => {
    const row = r as { service_id: string; services?: { name?: string } | { name?: string }[] | null };
    const svc = Array.isArray(row.services) ? row.services[0] : row.services;
    const name = svc?.name ?? "Unknown";
    const sid = row.service_id ?? "unknown";
    if (!countMap[sid]) countMap[sid] = { name, count: 0 };
    countMap[sid].count++;
  });
  const popularServices = Object.entries(countMap)
    .map(([, v]) => v)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Customer retention (simplified: customers with 2+ visits in last 30 days)
  const { data: customersWithVisits } = await supabase
    .from("bookings")
    .select("customer_id")
    .eq("business_id", businessId)
    .gte("booking_date", thirtyDaysAgo)
    .in("status", ["completed", "confirmed"]);

  const visitCount: Record<string, number> = {};
  (customersWithVisits ?? []).forEach((r: { customer_id: string }) => {
    visitCount[r.customer_id] = (visitCount[r.customer_id] ?? 0) + 1;
  });
  const repeatCustomers = Object.values(visitCount).filter((c) => c >= 2).length;
  const totalUnique = Object.keys(visitCount).length;
  const retentionRate = totalUnique > 0 ? Math.round((repeatCustomers / totalUnique) * 100) : 0;

  // Peak hours (last 30 days)
  const { data: hourRows } = await supabase
    .from("bookings")
    .select("booking_time")
    .eq("business_id", businessId)
    .gte("booking_date", thirtyDaysAgo)
    .in("status", ["completed", "confirmed"]);

  const hourCount: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourCount[h] = 0;
  (hourRows ?? []).forEach((r: { booking_time: string }) => {
    const hour = parseInt(r.booking_time?.split(":")[0] ?? "0", 10);
    hourCount[hour] = (hourCount[hour] ?? 0) + 1;
  });
  const peakHours = Object.entries(hourCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([h]) => parseInt(h, 10));

  return jsonResponse({
    revenueTrend,
    popularServices,
    retentionRate,
    peakHours,
  });
}
