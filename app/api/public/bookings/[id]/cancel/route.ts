// ============================================================
// POST /api/public/bookings/:id/cancel
// Customer cancel booking (verify by phone in body)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env vars");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function last10Digits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { phone?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone = body?.phone ?? "";
  if (!id || !phone.trim()) {
    return NextResponse.json(
      { error: "Booking ID and phone number are required" },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  const userLast10 = last10Digits(phone);

  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, status, business_id, customers(phone)")
    .eq("id", id)
    .single();

  if (fetchErr || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const cust = (booking as { customers?: { phone?: string } }).customers;
  const custLast10 = last10Digits(cust?.phone ?? "");
  if (!custLast10 || custLast10 !== userLast10) {
    return NextResponse.json(
      { error: "Phone number does not match this booking" },
      { status: 403 }
    );
  }

  const status = (booking as { status: string }).status;
  if (status === "cancelled") {
    return NextResponse.json({ error: "Booking is already cancelled" }, { status: 400 });
  }
  if (status === "completed") {
    return NextResponse.json({ error: "Completed bookings cannot be cancelled" }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancellation_reason: body.reason ?? "Cancelled by customer",
    })
    .eq("id", id);

  if (updateErr) {
    console.error("[public/bookings/cancel]", updateErr);
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Booking cancelled" });
}
