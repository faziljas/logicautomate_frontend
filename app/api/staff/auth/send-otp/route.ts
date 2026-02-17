// POST /api/staff/auth/send-otp — Send OTP to staff phone
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsonResponse, badRequest } from "@/lib/dashboard/api-helpers";

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
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!staffRow) {
    return jsonResponse({ error: "Staff account is inactive" }, { status: 403 });
  }

  try {
    await supabase.from("staff_otp").upsert(
      { phone: normalized, otp, expires_at: expiresAt.toISOString() },
      { onConflict: "phone" }
    );
  } catch (e) {
    console.error("[staff send-otp] DB error", e);
    return jsonResponse({ error: "Failed to store OTP" }, { status: 500 });
  }

  // Send OTP via Meta WhatsApp if configured
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_PHONE_ID;
  if (token && phoneId) {
    try {
      const to = normalized.replace(/\D/g, "");
      const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: {
            body: `Your BookFlow staff login code: ${otp}. Valid for 10 minutes.`,
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) {
        console.error("[staff send-otp] Meta error:", data);
        return jsonResponse({ error: data?.error?.message ?? "Failed to send OTP" }, { status: 500 });
      }
    } catch (err) {
      console.error("[staff send-otp] Meta error", err);
      return jsonResponse({ error: "Failed to send OTP" }, { status: 500 });
    }
  } else {
    console.log("[staff send-otp] No Meta WhatsApp config; OTP (dev):", otp);
  }

  return jsonResponse({ success: true, message: "OTP sent" });
}
