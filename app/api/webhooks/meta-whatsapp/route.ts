// ============================================================
// Meta WhatsApp Webhook
// GET: Webhook verification (Meta requires this)
// POST: Incoming messages and delivery status updates
// Configure in Meta Developer Console → WhatsApp → Configuration
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { handleIncomingMessage, type IncomingMessage } from "@/lib/whatsapp/incoming-message-handler";
import { createClient } from "@supabase/supabase-js";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "bookflow-verify";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

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
  const body = await request.json().catch(() => ({}));
  
  if (body?.object !== "whatsapp_business_account") {
    return NextResponse.json({ success: true, message: "Not a WhatsApp event" });
  }

  const supabase = getSupabase();
  const entries = (body as { entry?: unknown[] }).entry ?? [];

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] }).changes ?? [];
    
    for (const change of changes) {
      const changeData = change as { field?: string; value?: unknown };
      
      if (changeData.field !== "messages") continue;
      
      const value = changeData.value as {
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
        }>;
      };
      
      // Handle incoming messages
      if (value?.messages) {
        for (const msg of value.messages) {
          // Only process text messages
          if (msg.type !== "text" || !msg.text?.body) {
            continue;
          }
          
          const incomingMessage: IncomingMessage = {
            from: msg.from,
            text: msg.text.body,
            messageId: msg.id,
            timestamp: msg.timestamp,
          };
          
          console.log("[meta-webhook] Received message:", {
            from: msg.from,
            text: msg.text.body,
            messageId: msg.id,
          });
          
          // Process the message
          const result = await handleIncomingMessage(incomingMessage);
          
          console.log("[meta-webhook] Message processed:", {
            success: result.success,
            handled: result.handled,
            error: result.error,
          });
          
          if (!result.success) {
            console.error("[meta-webhook] Failed to handle message:", result.error);
          }
        }
      }
      
      // Handle delivery status updates
      if (value?.statuses) {
        for (const status of value.statuses) {
          // Update whatsapp_logs with delivery status
          await supabase
            .from("whatsapp_logs")
            .update({
              status: status.status === "delivered" ? "delivered" : 
                      status.status === "read" ? "read" : 
                      status.status === "failed" ? "failed" : "sent",
              ...(status.status === "delivered" && { delivered_at: new Date(parseInt(status.timestamp) * 1000).toISOString() }),
              ...(status.status === "read" && { read_at: new Date(parseInt(status.timestamp) * 1000).toISOString() }),
            })
            .eq("provider_id", status.id);
        }
      }
    }
  }

  return NextResponse.json({ success: true });
}
