// POST /api/staff/payments/collect — Record payment (remaining amount) for a booking
import { NextRequest } from "next/server";
import { getStaffFromRequest, getAdminClient } from "@/lib/staff-auth";
import { jsonResponse, unauthorized, badRequest } from "@/lib/dashboard/api-helpers";

export async function POST(request: NextRequest) {
  const payload = getStaffFromRequest(request);
  if (!payload) return unauthorized();

  let body: { bookingId: string; amount: number; paymentMethod?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const { bookingId, amount, paymentMethod = "cash", notes } = body;
  if (!bookingId || amount == null || amount < 0) {
    return badRequest("bookingId and amount required");
  }
  const method = ["cash", "upi", "card", "razorpay"].includes(paymentMethod)
    ? paymentMethod
    : "cash";

  const supabase = getAdminClient();

  const { data: booking, error: bookErr } = await supabase
    .from("bookings")
    .select("id, business_id, staff_id, total_amount, advance_paid, remaining_amount")
    .eq("id", bookingId)
    .single();

  if (bookErr || !booking) {
    return jsonResponse({ error: "Booking not found" }, { status: 404 });
  }
  if ((booking as { staff_id: string }).staff_id !== payload.sub) {
    return jsonResponse({ error: "Forbidden" }, { status: 403 });
  }
  if ((booking as { business_id: string }).business_id !== payload.businessId) {
    return jsonResponse({ error: "Forbidden" }, { status: 403 });
  }

  const remaining = Number((booking as { remaining_amount?: number }).remaining_amount ?? 0);
  if (remaining <= 0 && amount > 0) {
    return badRequest("No remaining amount to collect");
  }

  const { error: payErr } = await supabase.from("payments").insert({
    booking_id: bookingId,
    business_id: payload.businessId,
    amount: Number(amount),
    payment_method: method,
    status: "completed",
    is_advance: false,
    notes: notes || null,
  });

  if (payErr) {
    console.error("[staff/payments/collect]", payErr);
    return jsonResponse({ error: "Failed to record payment" }, { status: 500 });
  }

  // Update booking advance_paid so remaining_amount reflects (advance + this payment)
  const currentAdvance = Number((booking as { advance_paid?: number }).advance_paid ?? 0);
  const newAdvance = currentAdvance + Number(amount);
  await supabase
    .from("bookings")
    .update({ advance_paid: newAdvance })
    .eq("id", bookingId);

  return jsonResponse({ success: true, collected: amount });
}
