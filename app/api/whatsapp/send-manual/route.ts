// ============================================================
// POST /api/whatsapp/send-manual
// Owner sends a promotional message to selected customers.
// ============================================================

import { NextRequest, NextResponse }   from "next/server";
import { createRouteHandlerClient }    from "@supabase/auth-helpers-nextjs";
import { createClient }                from "@supabase/supabase-js";
import { cookies }                     from "next/headers";
import { sendWhatsApp }                from "@/lib/whatsapp/meta-client";
import { renderTemplate }              from "@/lib/whatsapp/template-renderer";
import { getBusinessConfig }           from "@/lib/templates/utils";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────
  const supabaseAuth = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // ── Body ─────────────────────────────────────────────────
  const body = await request.json();
  const { businessId, messageTemplate, customerIds, sendToAll = false } = body;

  if (!businessId || !messageTemplate) {
    return NextResponse.json(
      { error: "businessId and messageTemplate are required" },
      { status: 400 }
    );
  }
  if (!sendToAll && (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0)) {
    return NextResponse.json(
      { error: "Provide customerIds array or set sendToAll: true" },
      { status: 400 }
    );
  }

  // ── Ownership check ──────────────────────────────────────
  const supabase = getAdmin();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, owner_id, name, created_at, subscription_tier")
    .eq("id", businessId)
    .single();

  if (!business || business.owner_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Check WhatsApp trial period for free tier ────────────
  const { isFreeTier, isInWhatsAppTrial } = await import("@/lib/plan-limits");
  if (isFreeTier(business.subscription_tier) && !isInWhatsAppTrial(business.created_at, business.subscription_tier)) {
    return NextResponse.json({ 
      error: "WhatsApp trial expired. Upgrade to Pro to send WhatsApp messages." 
    }, { status: 403 });
  }

  // ── Fetch target customers ───────────────────────────────
  let query = supabase
    .from("customers")
    .select("id, name, phone")
    .eq("business_id", businessId)
    .eq("is_active", true);

  if (!sendToAll) query = query.in("id", customerIds);

  const { data: customers } = await query;
  if (!customers || customers.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, message: "No customers found" });
  }

  const config = await getBusinessConfig(businessId);

  // ── Send messages ────────────────────────────────────────
  const results = { sent: 0, failed: 0, errors: [] as string[] };

  for (const customer of customers) {
    if (!customer.phone) continue;

    const { message } = renderTemplate(messageTemplate, {
      customer_name: customer.name,
      business_name: business.name,
    });

    const res = await sendWhatsApp({
      businessId,
      to:           customer.phone,
      messageType:  "custom",
      customMessage: message,
      templateUsed: "manual_promotional",
      config:       config!,
      variables:    {},
    });

    if (res.success) results.sent++;
    else {
      results.failed++;
      results.errors.push(`${customer.phone}: ${res.error}`);
    }

    // Rate limit: avoid hitting Meta API limits
    await new Promise((r) => setTimeout(r, 100));
  }

  return NextResponse.json(results);
}
