// ============================================================
// BookFlow — Add to Waitlist API
// POST /api/waitlist/add
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  
  let body: {
    businessId: string;
    customerId: string;
    serviceId: string;
    staffId?: string;
    preferredDate?: string;
    preferredTime?: string;
    preferredDays?: string[];
    preferredTimes?: string[];
  };
  
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  
  const { businessId, customerId, serviceId, staffId, preferredDate, preferredTime, preferredDays, preferredTimes } = body;
  
  if (!businessId || !customerId || !serviceId) {
    return NextResponse.json(
      { error: "businessId, customerId, and serviceId are required" },
      { status: 400 }
    );
  }
  
  // Check if already on waitlist
  const { data: existing } = await supabase
    .from("waitlist")
    .select("id")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .eq("service_id", serviceId)
    .eq("status", "active")
    .maybeSingle();
  
  if (existing) {
    return NextResponse.json(
      { error: "You are already on the waitlist for this service" },
      { status: 409 }
    );
  }
  
  // Add to waitlist
  const { data, error } = await supabase
    .from("waitlist")
    .insert({
      business_id: businessId,
      customer_id: customerId,
      service_id: serviceId,
      staff_id: staffId || null,
      preferred_date: preferredDate || null,
      preferred_time: preferredTime || null,
      preferred_days: preferredDays || null,
      preferred_times: preferredTimes || null,
      status: "active",
    })
    .select()
    .single();
  
  if (error) {
    console.error("[waitlist/add]", error);
    return NextResponse.json({ error: "Failed to add to waitlist" }, { status: 500 });
  }
  
  return NextResponse.json({ success: true, waitlistEntry: data });
}
