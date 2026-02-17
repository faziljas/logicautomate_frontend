// ============================================================
// BookFlow — WhatsApp Retry Endpoint
// POST /api/whatsapp/retry
// Retries failed WhatsApp messages (called by cron or manual trigger)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { processFailedMessages, retryFailedMessage } from "@/lib/whatsapp/retry";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { logId } = body;

    // If specific logId provided, retry that one
    if (logId) {
      const result = await retryFailedMessage(logId);
      return NextResponse.json(result, {
        status: result.success ? 200 : 500,
      });
    }

    // Otherwise, process all failed messages
    const result = await processFailedMessages();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[whatsapp/retry] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retry messages" },
      { status: 500 }
    );
  }
}
