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

  // Default working hours (Mon–Fri 9–5) so slots work immediately after adding staff
  const DEFAULT_WORKING_HOURS: Record<
    string,
    { start: string; end: string } | null
  > = {
    monday: { start: "09:00", end: "17:00" },
    tuesday: { start: "09:00", end: "17:00" },
    wednesday: { start: "09:00", end: "17:00" },
    thursday: { start: "09:00", end: "17:00" },
    friday: { start: "09:00", end: "17:00" },
    saturday: null,
    sunday: null,
  };
  const effectiveWorkingHours =
    workingHours && Object.keys(workingHours).length > 0
      ? workingHours
      : DEFAULT_WORKING_HOURS;

  const { data: staff, error: staffErr } = await supabase
    .from("staff")
    .insert({
      business_id: businessId,
      user_id: userId,
      role_name: roleName?.trim() || "Staff",
      working_hours: effectiveWorkingHours,
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

// ============================================================
// PATCH /api/staff
// Update staff. Owner only.
// Body: { staffId, businessId, name, email?, phone?, roleName }
// ============================================================

export async function PATCH(request: NextRequest) {
  const { session, business, supabase, isOwner, error } = await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }

  if (!isOwner) {
    return jsonResponse({ error: "Owner only" }, { status: 403 });
  }

  let body: {
    staffId: string;
    businessId: string;
    name: string;
    email?: string;
    phone?: string;
    roleName?: string;
  };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const { staffId, businessId, name, email, phone, roleName } = body;
  if (!staffId || !businessId || businessId !== business.id) {
    return badRequest("staffId and businessId required");
  }
  if (!name?.trim()) return badRequest("name required");
  if (!email?.trim() && !phone?.trim()) {
    return badRequest("email or phone required");
  }

  const { data: staffRow, error: staffErr } = await supabase
    .from("staff")
    .select("id, user_id")
    .eq("id", staffId)
    .eq("business_id", businessId)
    .single();

  if (staffErr || !staffRow) {
    return jsonResponse({ error: "Staff not found" }, { status: 404 });
  }

  const userId = staffRow.user_id;

  const { error: userUpdateErr } = await supabase
    .from("users")
    .update({
      name: name.trim(),
      email: email?.trim() ? email.trim().toLowerCase() : null,
      phone: phone?.trim() || null,
    })
    .eq("id", userId);

  if (userUpdateErr) {
    console.error("[staff PATCH user]", userUpdateErr);
    return jsonResponse({ error: "Failed to update staff" }, { status: 500 });
  }

  const { error: staffUpdateErr } = await supabase
    .from("staff")
    .update({
      role_name: roleName?.trim() || "Staff",
    })
    .eq("id", staffId)
    .eq("business_id", businessId);

  if (staffUpdateErr) {
    console.error("[staff PATCH staff]", staffUpdateErr);
    return jsonResponse({ error: "Failed to update staff" }, { status: 500 });
  }

  return jsonResponse({ ok: true });
}
