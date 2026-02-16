// ============================================================
// GET /api/dashboard/services
export const dynamic = "force-dynamic";
// List services. Owner only for edit; staff can read.
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

  const { data: services, error: fetchErr } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", businessId)
    .order("display_order")
    .order("name");

  if (fetchErr) {
    console.error("[dashboard/services]", fetchErr);
    return jsonResponse({ error: "Failed to fetch" }, { status: 500 });
  }

  return jsonResponse({ services: services ?? [] });
}
