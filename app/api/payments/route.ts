// ============================================================
// GET /api/payments
// List payments for a business (owner auth required).
// Query: ?businessId=xxx&status=pending|completed|failed|refunded
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(request: NextRequest) {
  const supabaseAuth = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const statusFilter = searchParams.get("status"); // pending | completed | failed | refunded

  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  const supabase = getAdmin();

  // ── Verify ownership ───────────────────────────────────────
  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .single();

  if (bizErr || !business || (business as { owner_id?: string }).owner_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Build query ────────────────────────────────────────────
  let query = supabase
    .from("payments")
    .select(`
      id, amount, status, payment_method,
      razorpay_order_id, razorpay_payment_id,
      refund_id, refund_amount, refund_status, refund_reason, refunded_at,
      paid_at, error_code, error_message,
      created_at,
      bookings(
        id, booking_date, booking_time, status,
        services(name),
        customers(name, phone, email)
      )
    `, { count: "exact" })
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .range(0, 99);

  if (statusFilter && ["pending", "completed", "failed", "refunded"].includes(statusFilter)) {
    if (statusFilter === "refunded") {
      query = query.eq("refund_status", "processed");
    } else {
      query = query.eq("status", statusFilter);
    }
  }

  const { data: payments, error } = await query;

  if (error) {
    console.error("[payments list]", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }

  return NextResponse.json({ payments: payments ?? [], count: payments?.length ?? 0 });
}
