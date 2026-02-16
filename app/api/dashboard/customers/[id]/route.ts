// ============================================================
// GET /api/dashboard/customers/:id
// PATCH /api/dashboard/customers/:id
export const dynamic = "force-dynamic";
// Full customer profile + visit history.
// PATCH: override name, phone, email, notes.
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

// ─────────────────────────────────────────
// PATCH /api/dashboard/customers/:id
// Override customer name, phone, email, notes
// ─────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, business, supabase, error } = await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }

  const { id } = await params;
  if (!id) return badRequest("Customer ID required");

  let body: { name?: string; phone?: string; email?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const { name, phone, email, notes } = body;

  const updates: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (typeof phone === "string" && phone.trim()) updates.phone = phone.trim();
  if (email !== undefined) updates.email = email?.trim() || null;
  if (notes !== undefined) updates.notes = notes?.trim() || null;

  if (Object.keys(updates).length === 0) {
    return badRequest("Provide at least one field to update: name, phone, email, notes");
  }

  const { data: customer, error: updateErr } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", id)
    .eq("business_id", business.id)
    .select()
    .single();

  if (updateErr) {
    if (updateErr.code === "23505") {
      return jsonResponse(
        { error: "A customer with this phone number already exists" },
        { status: 409 }
      );
    }
    console.error("[customers PATCH]", updateErr);
    return jsonResponse({ error: "Failed to update customer" }, { status: 500 });
  }

  return jsonResponse({ customer });
}
