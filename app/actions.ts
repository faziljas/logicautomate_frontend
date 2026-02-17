// ============================================================
// BookFlow — Server Actions
// ============================================================

"use server";

import { Client } from "@upstash/qstash";
import { scheduleReminders } from "@/lib/qstash/schedule-reminders";

function getQStashClient() {
  const token = process.env.QSTASH_TOKEN;
  const baseUrl = process.env.QSTASH_URL;
  if (!token) throw new Error("QSTASH_TOKEN is required");
  return new Client({
    token,
    ...(baseUrl && { baseUrl }),
  });
}

/**
 * Demo: Simulate creating a booking and schedule two QStash reminder messages.
 * Message A: 24 hours before bookingTime
 * Message B: 2 hours before bookingTime
 *
 * Uses phoneNumber + message in the payload (console.log in send-reminder route).
 */
export async function createBooking(
  userPhone: string,
  bookingTime: string // ISO string, e.g. "2026-02-20T14:00:00"
) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  if (!baseUrl) {
    return { error: "NEXT_PUBLIC_APP_URL is not set" };
  }

  const targetUrl = `${baseUrl}/api/send-reminder`;

  const dt = new Date(bookingTime);
  const dateStr = dt.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const body24h = {
    phoneNumber: userPhone,
    message: `Reminder: Your appointment is in 24 hours (${dateStr}).`,
  };
  const body2h = {
    phoneNumber: userPhone,
    message: `Reminder: Your appointment is in 2 hours (${dateStr}).`,
  };

  const client = getQStashClient();
  const ms = dt.getTime();
  const notBefore24h = Math.floor(ms / 1000) - 24 * 60 * 60;
  const notBefore2h = Math.floor(ms / 1000) - 2 * 60 * 60;
  const nowSec = Math.floor(Date.now() / 1000);

  const results: { messageId24h?: string; messageId2h?: string; error?: string } = {};

  try {
    if (notBefore24h > nowSec) {
      const res24 = await client.publishJSON({
        url: targetUrl,
        body: body24h,
        notBefore: notBefore24h,
      });
      results.messageId24h = (res24 as { messageId?: string })?.messageId;
    }
    if (notBefore2h > nowSec) {
      const res2 = await client.publishJSON({
        url: targetUrl,
        body: body2h,
        notBefore: notBefore2h,
      });
      results.messageId2h = (res2 as { messageId?: string })?.messageId;
    }
    return results;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ...results, error: msg };
  }
}
