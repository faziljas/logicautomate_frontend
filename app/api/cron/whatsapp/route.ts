// ============================================================
// GET /api/cron/whatsapp
// Vercel Cron: runs every 5 minutes  (vercel.json → crons)
// Also callable manually by passing Authorization: Bearer <CRON_SECRET>
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { runWhatsAppScheduler }      from "@/lib/cron/whatsapp-scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected   = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runWhatsAppScheduler();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/whatsapp]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
