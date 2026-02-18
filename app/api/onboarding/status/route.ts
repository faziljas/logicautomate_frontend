// ============================================================
// GET /api/onboarding/status
// Returns whether the current user already has a business (for free-tier limits).
// ============================================================

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function GET() {
  const supabaseAuth = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) {
    return NextResponse.json({ hasBusiness: false, subscriptionTier: null });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: biz } = await admin
    .from("businesses")
    .select("id, subscription_tier")
    .eq("owner_id", session.user.id)
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    hasBusiness: !!biz,
    subscriptionTier: biz?.subscription_tier ?? null,
  });
}
