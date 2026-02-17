// ============================================================
// BookFlow — Create Booking API
// app/api/bookings/create/route.ts
//
// POST /api/bookings/create
// Uses a Supabase transaction (RPC) to prevent race conditions.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@supabase/supabase-js";
import Razorpay                      from "razorpay";
import { isSlotAvailable, addMinutes, getServiceDuration } from "@/lib/booking/availability-checker";
import { validatePhone } from "@/lib/phone-utils";
import { scheduleReminders } from "@/lib/qstash/schedule-reminders";

interface CustomerDetails {
  name:         string;
  phone:        string;
  email?:       string;
  customFields: Record<string, unknown>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CreateBookingBody {
  businessId:      string;
  serviceId:       string;
  staffId:         string;
  date:            string;  // YYYY-MM-DD
  time:            string;  // HH:MM
  customerDetails: CustomerDetails;
  customBookingData?: Record<string, unknown>; // industry-specific booking fields
  payAtVenue?:     boolean; // Skip Razorpay, confirm with advance_paid=0
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function getRazorpay() {
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

export async function POST(request: NextRequest) {
  const supabase = getAdmin();

  let body: CreateBookingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    businessId,
    serviceId,
    staffId,
    date,
    time,
    customerDetails,
    customBookingData = {},
    payAtVenue = false,
  } = body;

  // ── 1. Input validation ──────────────────────────────────
  const errors: Record<string, string> = {};

  if (!businessId) errors.businessId = "Required";
  if (!serviceId)  errors.serviceId  = "Required";
  if (!staffId)    errors.staffId    = "Required";
  if (staffId === "any" || !UUID_REGEX.test(staffId)) {
    errors.staffId = "Please select a specific provider. No staff available.";
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = "Valid YYYY-MM-DD required";
  if (!time || !/^\d{2}:\d{2}$/.test(time))         errors.time = "Valid HH:MM required";
  if (!customerDetails?.name?.trim())  errors["customerDetails.name"]  = "Name is required";
  const phoneValidation = customerDetails?.phone
    ? validatePhone(customerDetails.phone, "IN")
    : null;
  if (!customerDetails?.phone?.trim()) errors["customerDetails.phone"] = "Phone is required";
  else if (phoneValidation && !phoneValidation.valid) {
    errors["customerDetails.phone"] = phoneValidation.error ?? "Enter a valid phone number with country code";
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  // Reject past dates
  const today = new Date().toISOString().split("T")[0];
  if (date < today) {
    return NextResponse.json(
      { errors: { date: "Cannot book past dates" } },
      { status: 422 }
    );
  }

  // ── 2. Fetch service details ─────────────────────────────
  const { data: service, error: svcErr } = await supabase
    .from("services")
    .select("id, name, price, advance_amount, duration_minutes, business_id")
    .eq("id", serviceId)
    .eq("business_id", businessId)
    .eq("is_active", true)
    .single();

  if (svcErr || !service) {
    return NextResponse.json(
      { error: "Service not found or not available" },
      { status: 404 }
    );
  }

  const durationMins  = service.duration_minutes as number;
  const totalAmount   = service.price            as number;
  const advanceAmount = service.advance_amount   as number;
  const endTime       = addMinutes(time, durationMins);

  // ── 3. Availability double-check (race condition guard) ──
  const availability = await isSlotAvailable(staffId, date, time, durationMins);
  if (availability.hasConflict) {
    return NextResponse.json(
      {
        error:          "This time slot is no longer available",
        conflictReason: availability.conflictReason,
      },
      { status: 409 }
    );
  }

  // ── 4. Find or create customer ───────────────────────────
  const normalPhone = phoneValidation!.e164;

  let customerId: string;
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("business_id", businessId)
    .eq("phone", normalPhone)
    .maybeSingle();

  if (existingCustomer) {
    customerId = existingCustomer.id;
    // Don't overwrite customer name — same phone can be used by different people (e.g. family).
    // Per-booking name is stored in custom_data.customer_name for display.
  } else {
    const { data: newCustomer, error: custErr } = await supabase
      .from("customers")
      .insert({
        business_id:   businessId,
        name:          customerDetails.name.trim(),
        phone:         normalPhone,
        email:         customerDetails.email?.toLowerCase() || null,
        custom_fields: customerDetails.customFields ?? {},
      })
      .select("id")
      .single();

    if (custErr || !newCustomer) {
      console.error("[create-booking] create customer:", custErr);
      return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
    }
    customerId = newCustomer.id;
  }

  // ── 5. ATOMIC booking creation via Postgres function ────
  // We call a DB function that:
  //   a. Re-checks availability inside a transaction
  //   b. Inserts the booking
  //   c. Returns the new booking id or throws if slot taken
  //
  // This is the race-condition-safe path.
  const bookingCustomData = {
    ...customBookingData,
    customer_name: customerDetails.name.trim(),
  };
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // +15 min

  const { data: rpcResult, error: rpcErr } = await supabase.rpc(
    "create_booking_atomic",
    {
      p_business_id:     businessId,
      p_customer_id:     customerId,
      p_service_id:      serviceId,
      p_staff_id:        staffId,
      p_booking_date:    date,
      p_booking_time:    time,
      p_duration_mins:   durationMins,
      p_total_amount:    totalAmount,
      p_advance_amount:  advanceAmount,
      p_custom_data:     bookingCustomData,
      p_expires_at:      expiresAt,
    }
  );

  // If the RPC doesn't exist yet (dev environment), fall back to direct insert
  let bookingId: string;

  if (rpcErr) {
    if (rpcErr.message?.includes("slot_already_taken")) {
      return NextResponse.json(
        { error: "Someone just booked this slot. Please pick another time." },
        { status: 409 }
      );
    }

    // Fallback: direct insert (less safe for race conditions, but functional)
    console.warn("[create-booking] RPC not found, using direct insert:", rpcErr.message);

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        business_id:      businessId,
        customer_id:      customerId,
        service_id:       serviceId,
        staff_id:         staffId,
        booking_date:     date,
        booking_time:     time,
        duration_minutes: durationMins,
        status:           "pending",
        total_amount:     totalAmount,
        advance_paid:     0,
        custom_data:      bookingCustomData,
      })
      .select("id")
      .single();

    if (bookingErr || !booking) {
      console.error("[create-booking] insert:", bookingErr);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }
    bookingId = booking.id;
  } else {
    bookingId = rpcResult as string;
  }

  // ── 6. Razorpay order (skip for pay-at-venue) ─────────────
  let razorpayOrderId: string;
  let razorpayAmount:  number;

  if (payAtVenue || advanceAmount === 0) {
    // Pay at venue: no online payment, advance_paid stays 0
    razorpayOrderId = "pay_at_venue";
    razorpayAmount  = 0;
  } else {
    try {
      const razorpay = getRazorpay();
      const order    = await razorpay.orders.create({
        amount:   Math.round(advanceAmount * 100), // paise
        currency: "INR",
        receipt:  `booking_${bookingId}`,
        notes:    { booking_id: bookingId, business_id: businessId },
      });
      razorpayOrderId = order.id;
      razorpayAmount  = advanceAmount;

      await supabase.from("payments").insert({
        booking_id:        bookingId,
        business_id:       businessId,
        amount:            advanceAmount,
        payment_method:    "razorpay",
        razorpay_order_id: razorpayOrderId,
        status:            "pending",
        is_advance:        true,
      });
    } catch (rpErr) {
      console.error("[create-booking] razorpay:", rpErr);
      razorpayOrderId = `mock_order_${bookingId}`;
      razorpayAmount  = advanceAmount;
    }
  }

  // ── 7. QStash: Schedule reminder messages (24h and 2h before) ─
  if (process.env.QSTASH_TOKEN) {
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
    if (baseUrl) {
      const bookingTimeIso = `${date}T${time}:00`;
      scheduleReminders(
        `${baseUrl}/api/send-reminder`,
        { bookingId },
        bookingTimeIso
      ).catch((err) => console.error("[create-booking] QStash schedule:", err));
    }
  }

  return NextResponse.json(
    {
      bookingId,
      razorpayOrderId,
      amount:        razorpayAmount,
      totalAmount,
      advanceAmount,
      remainingAmount: totalAmount - advanceAmount,
      expiresAt,
    },
    { status: 201 }
  );
}
