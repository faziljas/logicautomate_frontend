// ============================================================
// QStash — Schedule reminder messages for a booking
// ============================================================

import { Client } from "@upstash/qstash";

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
 * Schedule two reminder messages via QStash:
 * - 24 hours before bookingTime
 * - 2 hours before bookingTime
 *
 * @param targetUrl Full URL of /api/send-reminder (e.g. https://yourapp.com/api/send-reminder)
 * @param body Payload to send { bookingId, reminderType? } or { phoneNumber, message }
 * @param bookingTime ISO string (e.g. "2026-02-20T14:00:00") or Date
 */
export async function scheduleReminders(
  targetUrl: string,
  body: { bookingId?: string; reminderType?: "24h" | "2h"; phoneNumber?: string; message?: string },
  bookingTime: string | Date
): Promise<{ messageId24h?: string; messageId2h?: string }> {
  const client = getQStashClient();
  const dt = typeof bookingTime === "string" ? new Date(bookingTime) : bookingTime;
  const ms = dt.getTime();

  // Unix timestamp in seconds for notBefore (QStash API)
  const notBefore24h = Math.floor(ms / 1000) - 24 * 60 * 60; // 24h before
  const notBefore2h = Math.floor(ms / 1000) - 2 * 60 * 60;   // 2h before
  const nowSec = Math.floor(Date.now() / 1000);

  const results: { messageId24h?: string; messageId2h?: string } = {};

  // Only schedule if the time is in the future
  if (notBefore24h > nowSec) {
    const res24 = await client.publishJSON({
      url: targetUrl,
      body: { ...body, reminderType: "24h" as const },
      notBefore: notBefore24h,
    });
    results.messageId24h = (res24 as { messageId?: string })?.messageId;
  }

  if (notBefore2h > nowSec) {
    const res2 = await client.publishJSON({
      url: targetUrl,
      body: { ...body, reminderType: "2h" as const },
      notBefore: notBefore2h,
    });
    results.messageId2h = (res2 as { messageId?: string })?.messageId;
  }

  return results;
}
