// ============================================================
// GET /api/dashboard/customers/:id
// Full customer profile + visit history.
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  badRequest,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, business, supabase, error } = await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }

  const { id } = await params;
  if (!id) return badRequest("Customer ID required");

  const { data: customer, error: custErr } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .single();

  if (custErr || !customer) {
    return jsonResponse({ error: "Customer not found" }, { status: 404 });
  }

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      id, booking_date, booking_time, status, total_amount,
      services(name, duration_minutes),
      staff(users(name))
    `)
    .eq("customer_id", id)
    .order("booking_date", { ascending: false })
    .order("booking_time", { ascending: false })
    .limit(50);

  return jsonResponse({
    customer,
    visitHistory: bookings ?? [],
  });
}
