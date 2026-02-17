// GET /api/whatsapp/logs?businessId=xxx&page=1&limit=50
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse }  from "next/server";
import { createRouteHandlerClient }   from "@supabase/auth-helpers-nextjs";
import { createClient }               from "@supabase/supabase-js";
import { cookies }                    from "next/headers";

export async function GET(request: NextRequest) {
  const supabaseAuth = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const page       = parseInt(searchParams.get("page")  ?? "1");
  const limit      = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const type       = searchParams.get("type");  // filter by message_type
  const status     = searchParams.get("status");  // filter by status

  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Verify ownership
  const { data: biz } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .single();

  if (!biz || biz.owner_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let query = supabase
    .from("whatsapp_logs")
    .select("*", { count: "exact" })
    .eq("business_id", businessId)
    .order("sent_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (type) query = query.eq("message_type", type);
  if (status) {
    if (status === "failed") {
      // Filter for both "failed" and "undelivered" statuses
      query = query.in("status", ["failed", "undelivered"]);
    } else {
      query = query.eq("status", status);
    }
  }

  const { data: logs, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs, total: count, page, limit });
}
