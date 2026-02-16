// ============================================================
// GET /api/dashboard/bookings
export const dynamic = "force-dynamic";
// List bookings with filters. Paginated.
// Query: businessId, startDate, endDate, status, staffId, serviceId, page, limit
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  badRequest,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";

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

  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const status = searchParams.get("status");
  const staffIdFilter = searchParams.get("staffId");
  const serviceId = searchParams.get("serviceId");
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  let query = supabase
    .from("bookings")
    .select(
      `
      id, booking_date, booking_time, duration_minutes, status,
      total_amount, advance_paid, special_requests, created_at,
      customers(id, name, phone, email),
      services(id, name, duration_minutes, price),
      staff(id, users(name), role_name)
    `,
      { count: "exact" }
    )
    .eq("business_id", businessId)
    .order("booking_date", { ascending: false })
    .order("booking_time", { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (startDate) query = query.gte("booking_date", startDate);
  if (endDate) query = query.lte("booking_date", endDate);
  if (status && ["pending", "confirmed", "completed", "cancelled", "no_show"].includes(status)) {
    query = query.eq("status", status);
  }
  if (staffIdFilter) query = query.eq("staff_id", staffIdFilter);
  if (serviceId) query = query.eq("service_id", serviceId);
  if (!isOwner && staffId) query = query.eq("staff_id", staffId);

  const { data: bookings, error: fetchErr, count } = await query;

  if (fetchErr) {
    console.error("[dashboard/bookings]", fetchErr);
    return jsonResponse({ error: "Failed to fetch bookings" }, { status: 500 });
  }

  return jsonResponse({
    bookings: bookings ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}
