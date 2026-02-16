// ============================================================
// GET /api/dashboard/customers
export const dynamic = "force-dynamic";
// List customers with search. Paginated.
// Query: businessId, search, page, limit
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  badRequest,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";

export async function GET(request: NextRequest) {
  const { session, business, supabase, error } = await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  if (!businessId || businessId !== business.id) {
    return badRequest("businessId required");
  }

  const search = searchParams.get("search")?.trim();
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  let query = supabase
    .from("customers")
    .select("id, name, phone, email, total_visits, total_spent, loyalty_points, created_at", {
      count: "exact",
    })
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("name")
    .range(page * limit, (page + 1) * limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: customers, error: fetchErr, count } = await query;

  if (fetchErr) {
    console.error("[dashboard/customers]", fetchErr);
    return jsonResponse({ error: "Failed to fetch" }, { status: 500 });
  }

  return jsonResponse({
    customers: customers ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}
