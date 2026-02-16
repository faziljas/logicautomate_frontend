// ============================================================
// GET /api/analytics/staff
// Staff performance analytics with date range.
// Query: start, end, businessId
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  badRequest,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";
import { getStaffPerformance, getDateRange } from "@/lib/analytics/calculators";

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
  const preset = (searchParams.get("preset") as "today" | "week" | "month") ?? "month";

  if (!businessId || businessId !== business.id) {
    return badRequest("businessId required");
  }

  const range = start && end ? { start, end } : getDateRange(preset);

  try {
    const metrics = await getStaffPerformance(
      supabase,
      businessId,
      range.start,
      range.end
    );
    return jsonResponse(metrics);
  } catch (err) {
    console.error("[analytics/staff]", err);
    return jsonResponse({ error: "Failed to compute staff analytics" }, { status: 500 });
  }
}
