// ============================================================
// Meta WhatsApp Webhook
// GET: Webhook verification (Meta requires this)
// POST: Incoming messages and delivery status updates
// Configure in Meta Developer Console → WhatsApp → Configuration
// ============================================================

import { NextRequest, NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "bookflow-verify";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  // Meta sends webhook events here (messages, status updates, etc.)
  // For now we acknowledge and log; extend as needed for delivery status
  const body = await request.json().catch(() => ({}));
  if (body?.object === "whatsapp_business_account") {
    // Log incoming events if needed
    const entries = (body as { entry?: unknown[] }).entry ?? [];
    for (const entry of entries) {
      const changes = (entry as { changes?: unknown[] }).changes ?? [];
      for (const change of changes) {
        const value = (change as { value?: unknown }).value;
        if (value) {
          console.log("[meta-webhook] WhatsApp event:", JSON.stringify(value).slice(0, 200));
        }
      }
    }
  }
  return NextResponse.json({ success: true });
}
