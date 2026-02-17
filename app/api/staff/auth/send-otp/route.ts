// POST /api/staff/auth/send-otp — Send OTP to staff phone
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsonResponse, badRequest } from "@/lib/dashboard/api-helpers";
import { getBusinessConfig, getLocalTemplateConfig } from "@/lib/templates/utils";
import { sendWhatsApp } from "@/lib/whatsapp/meta-client";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function normalizePhone(phone: string): string {
  const p = phone.replace(/\D/g, "");
  if (p.length === 10 && p.startsWith("6") === false) return `+91${p}`;
  if (p.length === 12 && p.startsWith("91")) return `+${p}`;
  return phone.startsWith("+") ? phone : `+${phone}`;
}

export async function POST(request: NextRequest) {
  let body: { phone?: string };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const phone = body.phone?.trim();
  if (!phone) return badRequest("phone required");

  const normalized = normalizePhone(phone);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  const supabase = getAdmin();

  // Check if this phone belongs to a staff user
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .or(`phone.eq.${normalized},phone.eq.${phone.replace(/\D/g, "")}`)
    .eq("role", "staff")
    .maybeSingle();

  if (!user) {
    return jsonResponse({ error: "No staff account found for this number" }, { status: 404 });
  }

  const { data: staffRow } = await supabase
    .from("staff")
    .select("id, business_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!staffRow) {
    return jsonResponse({ error: "Staff account is inactive" }, { status: 403 });
  }

  const businessId = (staffRow as { business_id: string }).business_id;

  try {
    await supabase.from("staff_otp").upsert(
      { phone: normalized, otp, expires_at: expiresAt.toISOString() },
      { onConflict: "phone" }
    );
  } catch (e) {
    console.error("[staff send-otp] DB error", e);
    return jsonResponse({ error: "Failed to store OTP" }, { status: 500 });
  }

  // Send OTP via Meta WhatsApp (uses template when META_OTP_TEMPLATE_NAME is set)
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_PHONE_ID;
  if (token && phoneId) {
    let config = await getBusinessConfig(businessId);
    if (!config) {
      config = getLocalTemplateConfig("salon") ?? getLocalTemplateConfig("clinic");
    }
    if (!config) {
      return jsonResponse({ error: "Business template config not found" }, { status: 500 });
    }
    const result = await sendWhatsApp({
      businessId,
      to: normalized,
      messageType: "staff_otp",
      variables: { otp },
      config,
      templateUsed: "staff_otp",
      templateNameOverride: process.env.META_OTP_TEMPLATE_NAME ?? "staff_otp",
      templateParamsOverride: [otp],
    });
    if (!result.success) {
      console.error("[staff send-otp] Meta error:", result.error);
      return jsonResponse({ error: result.error ?? "Failed to send OTP" }, { status: 500 });
    }
  } else {
    console.log("[staff send-otp] No Meta WhatsApp config; OTP (dev):", otp);
  }

  return jsonResponse({ success: true, message: "OTP sent" });
}
