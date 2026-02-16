// ============================================================
// POST /api/staff
// Add new staff. Owner only.
// Body: { businessId, name, email, phone, roleName, workingHours, serviceIds? }
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  badRequest,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";

export async function POST(request: NextRequest) {
  const { session, business, supabase, isOwner, error } = await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }

  if (!isOwner) {
    return jsonResponse({ error: "Owner only" }, { status: 403 });
  }

  let body: {
    businessId: string;
    name: string;
    email?: string;
    phone?: string;
    roleName?: string;
    workingHours?: Record<string, { start: string; end: string }>;
    serviceIds?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const { businessId, name, email, phone, roleName, workingHours } = body;
  if (!businessId || businessId !== business.id) {
    return badRequest("businessId required");
  }
  if (!name?.trim()) return badRequest("name required");
  if (!email?.trim() && !phone?.trim()) {
    return badRequest("email or phone required");
  }

  // Find or create user
  let userId: string;
  if (email) {
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: newUser, error: userErr } = await supabase
        .from("users")
        .insert({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone?.trim() || null,
          role: "staff",
          business_id: businessId,
        })
        .select("id")
        .single();
      if (userErr || !newUser) {
        return jsonResponse({ error: "Failed to create user" }, { status: 500 });
      }
      userId = newUser.id;
    }
  } else {
    const { data: existingByPhone } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone!.trim())
      .maybeSingle();
    if (existingByPhone) {
      userId = existingByPhone.id;
    } else {
      const { data: newUser, error: userErr } = await supabase
        .from("users")
        .insert({
          name: name.trim(),
          phone: phone!.trim(),
          email: null,
          role: "staff",
          business_id: businessId,
        })
        .select("id")
        .single();
      if (userErr || !newUser) {
        return jsonResponse({ error: "Failed to create user" }, { status: 500 });
      }
      userId = newUser.id;
    }
  }

  const { data: staff, error: staffErr } = await supabase
    .from("staff")
    .insert({
      business_id: businessId,
      user_id: userId,
      role_name: roleName?.trim() || "Staff",
      working_hours: workingHours ?? {},
      specializations: [],
      is_active: true,
    })
    .select()
    .single();

  if (staffErr) {
    if (staffErr.code === "23505") {
      return jsonResponse({ error: "Staff already exists for this business" }, { status: 409 });
    }
    console.error("[staff POST]", staffErr);
    return jsonResponse({ error: "Failed to add staff" }, { status: 500 });
  }

  return jsonResponse({ staff }, { status: 201 });
}
