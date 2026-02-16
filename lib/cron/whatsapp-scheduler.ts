// ============================================================
// BookFlow — WhatsApp Scheduler Cron
// lib/cron/whatsapp-scheduler.ts
// ============================================================
// Runs every 5 minutes. Finds bookings that need automated
// messages and fires them via the Twilio client.
// ============================================================

import { createClient }       from "@supabase/supabase-js";
import {
  send24hReminder,
  send2hReminder,
  sendNoShowFollowup,
  sendFeedbackRequest,
  sendLoyaltyReward,
  type BookingForMessage,
} from "@/lib/whatsapp/twilio-client";
import { getBusinessConfig }  from "@/lib/templates/utils";
import type { TemplateConfig } from "@/lib/templates/types";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
export interface SchedulerResult {
  ran_at:           string;
  reminder_24h:     number;
  reminder_2h:      number;
  no_show_followup: number;
  feedback:         number;
  loyalty_reward:   number;
  errors:           string[];
}

// ─────────────────────────────────────────
// SUPABASE
// ─────────────────────────────────────────
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ─────────────────────────────────────────
// BOOKING QUERY HELPER
// Returns full booking data needed for messages
// ─────────────────────────────────────────
const BOOKING_SELECT = `
  id, business_id, status,
  booking_date, booking_time, duration_minutes,
  total_amount, advance_paid,
  reminder_24h_sent, reminder_2h_sent, feedback_sent,
  customers(name, phone),
  services(name),
  staff(users(name)),
  businesses(name, address, phone, slug, google_review_link, custom_config)
`;

function rowToBooking(row: any): BookingForMessage {
  return {
    id:               row.id,
    business_id:      row.business_id,
    customer_name:    row.customers?.name   ?? "Customer",
    customer_phone:   row.customers?.phone  ?? "",
    service_name:     row.services?.name    ?? "Service",
    staff_name:       row.staff?.users?.name ?? "Staff",
    booking_date:     row.booking_date,
    booking_time:     row.booking_time,
    duration_minutes: row.duration_minutes,
    total_amount:     row.total_amount,
    advance_paid:     row.advance_paid,
    business_name:    row.businesses?.name    ?? "",
    business_address: row.businesses?.address ?? "",
    business_phone:   row.businesses?.phone   ?? "",
    business_slug:    row.businesses?.slug    ?? "",
    google_review_link: row.businesses?.google_review_link ?? "",
  };
}

function getConfig(row: any): TemplateConfig | null {
  return row.businesses?.custom_config ?? null;
}

// ─────────────────────────────────────────
// CONFIG CACHE (per-run, avoids duplicate DB calls)
// ─────────────────────────────────────────
const configCache = new Map<string, TemplateConfig | null>();

async function getCachedConfig(businessId: string): Promise<TemplateConfig | null> {
  if (configCache.has(businessId)) return configCache.get(businessId) ?? null;
  const config = await getBusinessConfig(businessId);
  configCache.set(businessId, config);
  return config;
}

// ─────────────────────────────────────────
// MAIN SCHEDULER
// ─────────────────────────────────────────
export async function runWhatsAppScheduler(): Promise<SchedulerResult> {
  const supabase = getAdmin();
  const now      = new Date();
  const result:  SchedulerResult = {
    ran_at:           now.toISOString(),
    reminder_24h:     0,
    reminder_2h:      0,
    no_show_followup: 0,
    feedback:         0,
    loyalty_reward:   0,
    errors:           [],
  };

  configCache.clear();

  await Promise.all([
    run24hReminders(supabase, now, result),
    run2hReminders(supabase, now, result),
    runNoShowFollowups(supabase, now, result),
    runFeedbackRequests(supabase, now, result),
  ]);

  return result;
}

// ─────────────────────────────────────────
// 1. 24-HOUR REMINDERS
// booking_date = tomorrow AND reminder_24h_sent = false
// ─────────────────────────────────────────
async function run24hReminders(
  supabase: any,
  now:      Date,
  result:   SchedulerResult
): Promise<void> {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: bookings } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("booking_date", tomorrowStr)
    .eq("status", "confirmed")
    .eq("reminder_24h_sent", false);

  for (const row of bookings ?? []) {
    try {
      const booking = rowToBooking(row);
      const config  = getConfig(row) ?? await getCachedConfig(row.business_id);
      if (!config || !booking.customer_phone) continue;

      const res = await send24hReminder(booking, config);

      if (res.success) {
        await supabase
          .from("bookings")
          .update({ reminder_24h_sent: true })
          .eq("id", booking.id);
        result.reminder_24h++;
      } else {
        result.errors.push(`24h reminder failed for booking ${booking.id}: ${res.error}`);
      }
    } catch (e) {
      result.errors.push(`24h reminder error ${row.id}: ${e}`);
    }
  }
}

// ─────────────────────────────────────────
// 2. 2-HOUR REMINDERS
// booking_date = today AND booking_time is within next 2h–2h5m
// ─────────────────────────────────────────
async function run2hReminders(
  supabase: any,
  now:      Date,
  result:   SchedulerResult
): Promise<void> {
  const todayStr  = now.toISOString().split("T")[0];

  // Window: now+1h55m to now+2h5m (±5 min tolerance for cron jitter)
  const windowStart = new Date(now.getTime() + (115 * 60 * 1000)); // +1h55m
  const windowEnd   = new Date(now.getTime() + (125 * 60 * 1000)); // +2h05m

  const startTime = `${String(windowStart.getHours()).padStart(2, "0")}:${String(windowStart.getMinutes()).padStart(2, "0")}`;
  const endTime   = `${String(windowEnd.getHours()).padStart(2, "0")}:${String(windowEnd.getMinutes()).padStart(2, "0")}`;

  const { data: bookings } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("booking_date", todayStr)
    .eq("status", "confirmed")
    .eq("reminder_2h_sent", false)
    .gte("booking_time", startTime)
    .lte("booking_time", endTime);

  for (const row of bookings ?? []) {
    try {
      const booking = rowToBooking(row);
      const config  = getConfig(row) ?? await getCachedConfig(row.business_id);
      if (!config || !booking.customer_phone) continue;

      const res = await send2hReminder(booking, config);

      if (res.success) {
        await supabase
          .from("bookings")
          .update({ reminder_2h_sent: true })
          .eq("id", booking.id);
        result.reminder_2h++;
      } else {
        result.errors.push(`2h reminder failed for booking ${booking.id}: ${res.error}`);
      }
    } catch (e) {
      result.errors.push(`2h reminder error ${row.id}: ${e}`);
    }
  }
}

// ─────────────────────────────────────────
// 3. NO-SHOW FOLLOW-UPS
// booking_time was 15 min ago AND status = confirmed (not completed/cancelled)
// ─────────────────────────────────────────
async function runNoShowFollowups(
  supabase: any,
  now:      Date,
  result:   SchedulerResult
): Promise<void> {
  const todayStr = now.toISOString().split("T")[0];

  // Look for bookings that ended 15–25 min ago (never marked complete)
  const windowStart = new Date(now.getTime() - (25 * 60 * 1000)); // 25 min ago
  const windowEnd   = new Date(now.getTime() - (15 * 60 * 1000)); // 15 min ago

  const wsTime = `${String(windowStart.getHours()).padStart(2, "0")}:${String(windowStart.getMinutes()).padStart(2, "0")}`;
  const weTime = `${String(windowEnd.getHours()).padStart(2, "0")}:${String(windowEnd.getMinutes()).padStart(2, "0")}`;

  const { data: bookings } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("booking_date", todayStr)
    .eq("status", "confirmed")   // still confirmed = no-show (would be 'completed' if done)
    .gte("booking_time", wsTime)
    .lte("booking_time", weTime);

  for (const row of bookings ?? []) {
    try {
      const booking = rowToBooking(row);
      const config  = getConfig(row) ?? await getCachedConfig(row.business_id);
      if (!config || !booking.customer_phone) continue;

      const res = await sendNoShowFollowup(booking, config);

      if (res.success) {
        // Mark as no_show in bookings table
        await supabase
          .from("bookings")
          .update({ status: "no_show" })
          .eq("id", booking.id);
        result.no_show_followup++;
      } else {
        result.errors.push(`No-show followup failed for ${booking.id}: ${res.error}`);
      }
    } catch (e) {
      result.errors.push(`No-show error ${row.id}: ${e}`);
    }
  }
}

// ─────────────────────────────────────────
// 4. FEEDBACK REQUESTS
// status = completed AND feedback_sent = false AND completed 2h ago
// ─────────────────────────────────────────
async function runFeedbackRequests(
  supabase: any,
  now:      Date,
  result:   SchedulerResult
): Promise<void> {
  // Find bookings completed more than 2h ago (using booking_date + booking_time as proxy)
  const twoHoursAgo     = new Date(now.getTime() - (2 * 60 * 60 * 1000));
  const twoHoursAgoDate = twoHoursAgo.toISOString().split("T")[0];
  const twoHoursAgoTime = `${String(twoHoursAgo.getHours()).padStart(2, "0")}:${String(twoHoursAgo.getMinutes()).padStart(2, "0")}`;

  const { data: bookings } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("status", "completed")
    .eq("feedback_sent", false)
    .or(`booking_date.lt.${twoHoursAgoDate},and(booking_date.eq.${twoHoursAgoDate},booking_time.lte.${twoHoursAgoTime})`);

  for (const row of bookings ?? []) {
    try {
      const booking = rowToBooking(row);
      const config  = getConfig(row) ?? await getCachedConfig(row.business_id);
      if (!config || !booking.customer_phone) continue;

      const res = await sendFeedbackRequest(booking, config);

      if (res.success) {
        await supabase
          .from("bookings")
          .update({ feedback_sent: true })
          .eq("id", booking.id);

        // Check loyalty milestone
        const { data: customer } = await supabase
          .from("customers")
          .select("total_visits, loyalty_points")
          .eq("id", row.customer_id)
          .single();

        if (customer) {
          const visits = customer.total_visits;
          const LOYALTY_MILESTONES = [5, 10, 20, 50];
          if (LOYALTY_MILESTONES.includes(visits)) {
            await sendLoyaltyReward(booking, config, visits);
            result.loyalty_reward++;
          }
        }

        result.feedback++;
      } else {
        result.errors.push(`Feedback failed for ${booking.id}: ${res.error}`);
      }
    } catch (e) {
      result.errors.push(`Feedback error ${row.id}: ${e}`);
    }
  }
}
