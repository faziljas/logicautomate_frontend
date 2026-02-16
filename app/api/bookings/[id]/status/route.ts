// ============================================================
// PATCH /api/bookings/:id/status
// Update booking status: completed | cancelled
// Body: { status, cancellationReason? }
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  badRequest,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, business, supabase, staffId, isOwner, error } =
    await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }

  const { id } = await params;
  if (!id) return badRequest("Booking ID required");

  let body: { status?: string; cancellationReason?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const { status, cancellationReason } = body;
  if (!status || !["completed", "cancelled"].includes(status)) {
    return badRequest("status must be 'completed' or 'cancelled'");
  }

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, business_id, staff_id, status")
    .eq("id", id)
    .single();

  if (fetchErr || !booking) {
    return jsonResponse({ error: "Booking not found" }, { status: 404 });
  }

  if ((booking as { business_id: string }).business_id !== business.id) {
    return jsonResponse({ error: "Forbidden" }, { status: 403 });
  }

  // Staff can only mark complete for their own bookings
  if (!isOwner && staffId) {
    if ((booking as { staff_id: string }).staff_id !== staffId) {
      return jsonResponse({ error: "Forbidden: not your booking" }, { status: 403 });
    }
    if (status === "cancelled") {
      return jsonResponse({ error: "Staff cannot cancel bookings" }, { status: 403 });
    }
  }

  const updates: Record<string, unknown> = { status };
  if (status === "cancelled" && cancellationReason) {
    updates.cancellation_reason = cancellationReason;
  }

  const { data: updated, error: updateErr } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) {
    console.error("[bookings/status]", updateErr);
    return jsonResponse({ error: "Failed to update" }, { status: 500 });
  }

  return jsonResponse({ booking: updated });
}
