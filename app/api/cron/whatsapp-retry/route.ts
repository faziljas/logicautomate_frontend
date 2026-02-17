// ============================================================
// BookFlow — WhatsApp Retry Cron Job
// GET /api/cron/whatsapp-retry
// Called by cron job to automatically retry failed WhatsApp messages
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { processFailedMessages } from "@/lib/whatsapp/retry";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Verify cron secret (optional but recommended)
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processFailedMessages();
    return NextResponse.json(
      {
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[cron/whatsapp-retry] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process retries",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
