// ============================================================
// POST /api/services
// Create new service. Owner only.
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  badRequest,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";

export async function POST(request: NextRequest) {
  const { session, business, supabase, isOwner, error } = await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }

  if (!isOwner) {
    return jsonResponse({ error: "Owner only" }, { status: 403 });
  }

  let body: {
    businessId: string;
    name: string;
    description?: string;
    duration_minutes?: number;
    price?: number;
    advance_amount?: number;
    category?: string;
    is_active?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const { businessId, name } = body;
  if (!businessId || businessId !== business.id) {
    return badRequest("businessId required");
  }
  if (!name?.trim()) return badRequest("name required");

  const { data: service, error: insertErr } = await supabase
    .from("services")
    .insert({
      business_id: businessId,
      name: name.trim(),
      description: body.description?.trim() || null,
      duration_minutes: Math.max(1, body.duration_minutes ?? 30),
      price: Math.max(0, body.price ?? 0),
      advance_amount: Math.max(0, body.advance_amount ?? 0),
      category: body.category?.trim() || null,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (insertErr) {
    console.error("[services POST]", insertErr);
    return jsonResponse({ error: "Failed to create service" }, { status: 500 });
  }

  return jsonResponse({ service }, { status: 201 });
}
