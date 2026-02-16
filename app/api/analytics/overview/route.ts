// ============================================================
// GET /api/analytics/overview
export const dynamic = "force-dynamic";
// Combined analytics for dashboard - fetches all metrics in parallel.
// Query: start, end, businessId, preset
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  badRequest,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";
import {
  calculateRevenue,
  getBookingStats,
  getCustomerMetrics,
  getTopServices,
  getStaffPerformance,
  getOperationalMetrics,
  getDateRange,
} from "@/lib/analytics/calculators";

export async function GET(request: NextRequest) {
  const { session, business, supabase, isOwner, error } =
    await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }
  if (!isOwner) {
    return jsonResponse({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const preset = (searchParams.get("preset") as "today" | "week" | "month") ?? "week";

  if (!businessId || businessId !== business.id) {
    return badRequest("businessId required");
  }

  const range = start && end ? { start, end } : getDateRange(preset);

  try {
    const [revenue, bookings, customers, services, staff, operational] = await Promise.all([
      calculateRevenue(supabase, businessId, range.start, range.end),
      getBookingStats(supabase, businessId, range.start, range.end),
      getCustomerMetrics(supabase, businessId, range.start, range.end),
      getTopServices(supabase, businessId, range.start, range.end),
      getStaffPerformance(supabase, businessId, range.start, range.end),
      getOperationalMetrics(supabase, businessId, range.start, range.end),
    ]);

    const response = jsonResponse({
      dateRange: { start: range.start, end: range.end },
      revenue,
      bookings,
      customers,
      services,
      staff,
      operational,
    });
    // Cache for 1 hour (expensive aggregation)
    response.headers.set("Cache-Control", "private, max-age=3600, stale-while-revalidate=600");
    return response;
  } catch (err) {
    console.error("[analytics/overview]", err);
    return jsonResponse({ error: "Failed to compute analytics" }, { status: 500 });
  }
}
