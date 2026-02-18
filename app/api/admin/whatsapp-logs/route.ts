// ============================================================
// BookFlow — Super Admin WhatsApp Logs
// GET /api/admin/whatsapp-logs
// AnyBooking founders can monitor all WhatsApp issues across all businesses
// ============================================================

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isSuperAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function GET(request: NextRequest) {
  const supabaseAuth = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabaseAuth.auth.getSession();

  if (!session || !isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized - Super admin access required" }, { status: 403 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);
  const status = searchParams.get("status");
  const businessId = searchParams.get("businessId");
  const minRetries = searchParams.get("minRetries"); // Filter messages that failed after X retries

  let query = supabase
    .from("whatsapp_logs")
    .select(
      `
      *,
      businesses(id, name, slug, owner_id),
      bookings(id, booking_date, booking_time, status)
    `,
      { count: "exact" }
    )
    .order("sent_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  // Filter by status
  if (status === "failed") {
    query = query.in("status", ["failed", "undelivered"]);
  } else if (status) {
    query = query.eq("status", status);
  }

  // Filter by business
  if (businessId) {
    query = query.eq("business_id", businessId);
  }

  // Filter messages that failed after max retries (critical issues)
  if (minRetries) {
    query = query.gte("retry_count", parseInt(minRetries));
  }

  const { data: logs, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get summary statistics
  const { data: stats } = await supabase
    .from("whatsapp_logs")
    .select("status, retry_count")
    .in("status", ["failed", "undelivered"]);

  const criticalIssues = stats?.filter((s) => (s.retry_count as number) >= 3).length ?? 0;
  const totalFailed = stats?.length ?? 0;

  return NextResponse.json({
    logs: logs || [],
    total: count || 0,
    page,
    limit,
    stats: {
      totalFailed,
      criticalIssues, // Failed after 3 retries - needs AnyBooking intervention
    },
  });
}
