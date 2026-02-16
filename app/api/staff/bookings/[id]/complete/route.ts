// POST /api/staff/bookings/:id/complete — Mark booking as completed
import { NextRequest } from "next/server";
import { getStaffFromRequest, getAdminClient } from "@/lib/staff-auth";
import { jsonResponse, unauthorized, badRequest } from "@/lib/dashboard/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getStaffFromRequest(request);
  if (!payload) return unauthorized();

  const { id } = await params;
  if (!id) return badRequest("Booking ID required");

  const supabase = getAdminClient();
  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, staff_id, business_id")
    .eq("id", id)
    .single();

  if (fetchErr || !booking) {
    return jsonResponse({ error: "Booking not found" }, { status: 404 });
  }
  if ((booking as { staff_id: string }).staff_id !== payload.sub) {
    return jsonResponse({ error: "Forbidden" }, { status: 403 });
  }

  const { data: updated, error: updateErr } = await supabase
    .from("bookings")
    .update({ status: "completed" })
    .eq("id", id)
    .select()
    .single();

  if (updateErr) {
    console.error("[staff/bookings/complete]", updateErr);
    return jsonResponse({ error: "Failed to update" }, { status: 500 });
  }

  return jsonResponse({ booking: updated });
}
