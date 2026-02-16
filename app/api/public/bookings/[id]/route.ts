// ============================================================
// GET /api/public/bookings/:id
// Customer view booking (verify by phone in query)
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone") ?? "";

  if (!id || !phone.trim()) {
    return NextResponse.json(
      { error: "Booking ID and phone number are required" },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  const userLast10 = last10Digits(phone);

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      `
      id, booking_date, booking_time, duration_minutes, status, total_amount, advance_paid,
      special_requests, cancellation_reason, created_at,
      businesses(id, name, slug, phone, address, city),
      services(id, name, duration_minutes, price),
      staff(id, role_name, users(name)),
      customers(id, name, phone, email)
    `
    )
    .eq("id", id)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const cust = (booking as { customers?: { phone?: string } }).customers;
  const custLast10 = last10Digits(cust?.phone ?? "");
  const matchPhone = custLast10 && userLast10 && custLast10 === userLast10;

  if (!matchPhone) {
    return NextResponse.json(
      { error: "Phone number does not match this booking" },
      { status: 403 }
    );
  }

  return NextResponse.json({ booking });
}
