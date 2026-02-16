// POST /api/staff/auth/verify — Verify OTP and return JWT + staff info
import { NextRequest } from "next/server";
import { createStaffToken, getAdminClient } from "@/lib/staff-auth";
import { jsonResponse, badRequest } from "@/lib/dashboard/api-helpers";

function normalizePhone(phone: string): string {
  const p = phone.replace(/\D/g, "");
  if (p.length === 10) return `+91${p}`;
  if (p.length === 12 && p.startsWith("91")) return `+${p}`;
  return phone.startsWith("+") ? phone : `+${phone}`;
}

export async function POST(request: NextRequest) {
  let body: { phone?: string; otp?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const { phone: rawPhone, otp } = body;
  const phone = rawPhone?.trim();
  if (!phone || !otp) return badRequest("phone and otp required");

  const normalized = normalizePhone(phone);
  const supabase = getAdminClient();

  const { data: row, error: fetchErr } = await supabase
    .from("staff_otp")
    .select("otp, expires_at")
    .eq("phone", normalized)
    .single();

  if (fetchErr || !row) {
    return jsonResponse({ error: "Invalid or expired OTP" }, { status: 401 });
  }
  if (new Date(row.expires_at) < new Date()) {
    await supabase.from("staff_otp").delete().eq("phone", normalized);
    return jsonResponse({ error: "OTP expired" }, { status: 401 });
  }
  if (row.otp !== otp.trim()) {
    return jsonResponse({ error: "Invalid OTP" }, { status: 401 });
  }

  await supabase.from("staff_otp").delete().eq("phone", normalized);

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .or(`phone.eq.${normalized},phone.eq.${phone.replace(/\D/g, "")}`)
    .eq("role", "staff")
    .single();

  if (!user) {
    return jsonResponse({ error: "Staff not found" }, { status: 404 });
  }

  const { data: staff, error: staffErr } = await supabase
    .from("staff")
    .select(`
      id,
      business_id,
      user_id,
      role_name,
      working_hours,
      rating,
      total_reviews,
      businesses(id, name, slug)
    `)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (staffErr || !staff) {
    return jsonResponse({ error: "Staff record not found" }, { status: 404 });
  }

  const biz = (staff as { businesses?: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] }).businesses;
  const business = Array.isArray(biz) ? biz[0] : biz;
  const token = createStaffToken({
    sub: staff.id,
    businessId: staff.business_id,
    userId: staff.user_id,
    phone: normalized,
  });

  return jsonResponse({
    token,
    staff: {
      id: staff.id,
      businessId: staff.business_id,
      userId: staff.user_id,
      roleName: staff.role_name,
      workingHours: staff.working_hours,
      rating: staff.rating,
      totalReviews: staff.total_reviews,
    },
    business: business ? { id: business.id, name: business.name, slug: business.slug } : null,
  });
}
