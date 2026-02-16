// POST /api/staff/bookings/:id/start — Mark booking as in progress (custom status or use "confirmed" + started_at)
// Schema has status: pending | confirmed | completed | cancelled | no_show. We'll use custom_data.started_at for timer.
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
    .select("id, staff_id, business_id, custom_data")
    .eq("id", id)
    .single();

  if (fetchErr || !booking) {
    return jsonResponse({ error: "Booking not found" }, { status: 404 });
  }
  if ((booking as { staff_id: string }).staff_id !== payload.sub) {
    return jsonResponse({ error: "Forbidden" }, { status: 403 });
  }
  if ((booking as { business_id: string }).business_id !== payload.businessId) {
    return jsonResponse({ error: "Forbidden" }, { status: 403 });
  }

  const customData = (booking as { custom_data?: Record<string, unknown> }).custom_data || {};
  const updates: { custom_data?: Record<string, unknown> } = {
    custom_data: { ...customData, started_at: new Date().toISOString() },
  };

  const { data: updated, error: updateErr } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) {
    console.error("[staff/bookings/start]", updateErr);
    return jsonResponse({ error: "Failed to update" }, { status: 500 });
  }

  return jsonResponse({ booking: updated });
}
