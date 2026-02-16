// PATCH /api/staff/bookings/:id/notes — Add private notes to booking (for next visit)
import { NextRequest } from "next/server";
import { getStaffFromRequest, getAdminClient } from "@/lib/staff-auth";
import { jsonResponse, unauthorized, badRequest } from "@/lib/dashboard/api-helpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getStaffFromRequest(request);
  if (!payload) return unauthorized();

  const { id } = await params;
  if (!id) return badRequest("Booking ID required");

  let body: { privateNotes?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const supabase = getAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, staff_id, custom_data")
    .eq("id", id)
    .single();

  if (!booking || (booking as { staff_id: string }).staff_id !== payload.sub) {
    return jsonResponse({ error: "Booking not found" }, { status: 404 });
  }

  const customData = (booking as { custom_data?: Record<string, unknown> }).custom_data || {};
  const updated = {
    custom_data: { ...customData, staff_private_notes: body.privateNotes ?? "" },
  };

  const { data: result, error } = await supabase
    .from("bookings")
    .update(updated)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[staff/bookings/notes]", error);
    return jsonResponse({ error: "Failed to update" }, { status: 500 });
  }

  return jsonResponse({ booking: result });
}
