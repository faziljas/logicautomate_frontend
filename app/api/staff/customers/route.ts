// GET /api/staff/customers — Search customers by name/phone (staff's business)
import { NextRequest } from "next/server";
import { getStaffFromRequest, getAdminClient } from "@/lib/staff-auth";
import { jsonResponse, unauthorized } from "@/lib/dashboard/api-helpers";

export async function GET(request: NextRequest) {
  const payload = getStaffFromRequest(request);
  if (!payload) return unauthorized();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  const supabase = getAdminClient();

  if (q.length < 2) {
    return jsonResponse({ customers: [] });
  }

  // Search by name (ilike) or phone (contains)
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, name, phone, email, total_visits, total_spent, notes, custom_fields")
    .eq("business_id", payload.businessId)
    .eq("is_active", true)
    .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
    .order("name")
    .limit(30);

  if (error) {
    console.error("[staff/customers]", error);
    return jsonResponse({ error: "Failed to search" }, { status: 500 });
  }

  return jsonResponse({ customers: customers ?? [] });
}
