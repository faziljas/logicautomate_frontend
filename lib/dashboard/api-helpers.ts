// ============================================================
// BookFlow — Dashboard API Helpers
// Shared utilities for dashboard API routes.
// ============================================================

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function getSessionAndBusiness() {
  const supabaseAuth = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) return { session: null, business: null, supabase: null, error: "Unauthorised" as const };

  const supabase = getAdminClient();

  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .select("id, name, slug, owner_id")
    .eq("owner_id", session.user.id)
    .single();

  if (bizErr || !business) {
    // Check if user is staff
    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, business_id")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (staffRow) {
      const { data: biz2 } = await supabase
        .from("businesses")
        .select("id, name, slug, owner_id")
        .eq("id", staffRow.business_id)
        .single();

      if (biz2) {
        return {
          session,
          business: biz2,
          supabase,
          staffId: staffRow.id,
          isOwner: false,
          error: null,
        };
      }
    }
    return { session, business: null, supabase, staffId: null, isOwner: false, error: "Business not found" as const };
  }

  return {
    session,
    business,
    supabase,
    staffId: null,
    isOwner: true,
    error: null,
  };
}

export function jsonResponse(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function unauthorized() {
  return Response.json({ error: "Unauthorised" }, { status: 401 });
}

export function forbidden() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

export function badRequest(msg: string) {
  return Response.json({ error: msg }, { status: 400 });
}
