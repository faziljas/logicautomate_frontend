// ============================================================
// PUT /api/services/:id
// Update service. Owner only.
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  badRequest,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, business, supabase, isOwner, error } = await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }

  if (!isOwner) {
    return jsonResponse({ error: "Owner only" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return badRequest("Service ID required");

  let body: {
    name?: string;
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

  const { data: existing } = await supabase
    .from("services")
    .select("id, business_id")
    .eq("id", id)
    .single();

  if (!existing || (existing as { business_id: string }).business_id !== business.id) {
    return jsonResponse({ error: "Service not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.duration_minutes !== undefined) updates.duration_minutes = body.duration_minutes;
  if (body.price !== undefined) updates.price = body.price;
  if (body.advance_amount !== undefined) updates.advance_amount = body.advance_amount;
  if (body.category !== undefined) updates.category = body.category;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  if (Object.keys(updates).length === 0) {
    return jsonResponse({ error: "No fields to update" }, { status: 400 });
  }

  const { data: updated, error: updateErr } = await supabase
    .from("services")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) {
    console.error("[services PUT]", updateErr);
    return jsonResponse({ error: "Failed to update" }, { status: 500 });
  }

  return jsonResponse({ service: updated });
}
