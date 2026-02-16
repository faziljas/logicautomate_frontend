// GET /api/staff/customers/:id/bookings — Past visits for a customer
import { NextRequest } from "next/server";
import { getStaffFromRequest, getAdminClient } from "@/lib/staff-auth";
import { jsonResponse, unauthorized, badRequest } from "@/lib/dashboard/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getStaffFromRequest(request);
  if (!payload) return unauthorized();

  const { id: customerId } = await params;
  if (!customerId) return badRequest("Customer ID required");

  const supabase = getAdminClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("id, business_id")
    .eq("id", customerId)
    .eq("business_id", payload.businessId)
    .single();

  if (!customer) {
    return jsonResponse({ error: "Customer not found" }, { status: 404 });
  }

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id, booking_date, booking_time, status, total_amount,
      services(name, duration_minutes),
      staff(users(name))
    `)
    .eq("customer_id", customerId)
    .order("booking_date", { ascending: false })
    .order("booking_time", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[staff/customers/bookings]", error);
    return jsonResponse({ error: "Failed to fetch" }, { status: 500 });
  }

  return jsonResponse({ bookings: bookings ?? [] });
}
