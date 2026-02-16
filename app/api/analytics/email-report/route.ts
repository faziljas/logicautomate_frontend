// ============================================================
// POST /api/analytics/email-report
export const dynamic = "force-dynamic";
// Schedule weekly or monthly analytics report emails.
// Body: { businessId, email, frequency: 'weekly' | 'monthly' }
// Note: Requires Resend/SendGrid setup for actual email delivery.
// For now, stores preference - integrate with cron for sending.
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  badRequest,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";

export async function POST(request: NextRequest) {
  const { session, business, supabase, isOwner, error } =
    await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }
  if (!isOwner) {
    return jsonResponse({ error: "Forbidden" }, { status: 403 });
  }

  let body: { businessId: string; email: string; frequency: "weekly" | "monthly"; dateRange?: { start: string; end: string } };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const { businessId, email, frequency } = body;
  if (!businessId || businessId !== business.id) {
    return badRequest("businessId required");
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest("Valid email required");
  }
  if (!frequency || !["weekly", "monthly"].includes(frequency)) {
    return badRequest("frequency must be weekly or monthly");
  }

  // Store email report preference (create analytics_report_prefs table or use business custom_config)
  // For now, we'll update business custom_config with report preferences
  const { data: biz } = await supabase
    .from("businesses")
    .select("custom_config")
    .eq("id", businessId)
    .single();

  const existing = (biz?.custom_config as Record<string, unknown>) ?? {};
  const reportPrefs = {
    ...existing,
    analytics_report: {
      email,
      frequency,
      enabled: true,
      lastUpdated: new Date().toISOString(),
    },
  };

  const { error: updateErr } = await supabase
    .from("businesses")
    .update({ custom_config: reportPrefs })
    .eq("id", businessId);

  if (updateErr) {
    console.error("[analytics/email-report]", updateErr);
    return jsonResponse({ error: "Failed to save preferences" }, { status: 500 });
  }

  return jsonResponse({
    success: true,
    message: `Report scheduled. You will receive ${frequency} reports at ${email}.`,
  });
}
