// ============================================================
// GET /api/dashboard/customers
export const dynamic = "force-dynamic";
// List customers with search. Paginated.
// Includes distinct "booker names" from bookings so people like Meeran
// (same phone, different name) appear even when they share a customer record.
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

  // 1. Fetch all active customers
  let custQuery = supabase
    .from("customers")
    .select("id, name, phone, email, total_visits, total_spent, loyalty_points, created_at")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("name");

  if (search) {
    custQuery = custQuery.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: custRows, error: custErr } = await custQuery;

  if (custErr) {
    console.error("[dashboard/customers]", custErr);
    return jsonResponse({ error: "Failed to fetch" }, { status: 500 });
  }

  if (!custRows?.length) {
    return jsonResponse({ customers: [], total: 0, page, limit });
  }

  // 2. Fetch bookings with custom_data to get distinct booker names per customer
  const custIds = custRows.map((c: { id: string }) => c.id);
  const { data: bookings } = await supabase
    .from("bookings")
    .select("customer_id, custom_data")
    .in("customer_id", custIds);

  const bookerNamesByCustId = new Map<string, Set<string>>();
  for (const b of bookings ?? []) {
    const cid = b.customer_id;
    const name = (b.custom_data as { customer_name?: string })?.customer_name;
    if (name?.trim()) {
      if (!bookerNamesByCustId.has(cid)) bookerNamesByCustId.set(cid, new Set());
      bookerNamesByCustId.get(cid)!.add(name.trim());
    }
  }

  // 3. Build list: one row per (customer, booker_name). Customer name is always included.
  const seen = new Set<string>();
  const expanded: Array<{
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    total_visits: number;
    total_spent: number;
    loyalty_points?: number;
    created_at: string;
  }> = [];

  for (const c of custRows) {
    const bookerNames = bookerNamesByCustId.get(c.id) ?? new Set();
    bookerNames.add(c.name);
    const names = [...bookerNames];
    for (const displayName of names) {
      const key = `${c.id}:${displayName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      expanded.push({
        id: c.id,
        name: displayName,
        phone: c.phone,
        email: c.email,
        total_visits: c.total_visits,
        total_spent: c.total_spent,
        loyalty_points: c.loyalty_points,
        created_at: c.created_at,
      });
    }
  }

  expanded.sort((a, b) => a.name.localeCompare(b.name));

  const total = expanded.length;
  const customers = expanded.slice(page * limit, (page + 1) * limit);

  return jsonResponse({
    customers,
    total,
    page,
    limit,
  });
}
