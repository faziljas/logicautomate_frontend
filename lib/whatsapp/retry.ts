// ============================================================
// BookFlow — WhatsApp Retry Mechanism
// Automatically retries failed WhatsApp messages up to 3 times
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { sendWhatsApp, type SendOptions } from "./meta-client";
import { getBusinessConfig } from "@/lib/templates/utils";
import type { BookingForMessage } from "./meta-client";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds between retries

/**
 * Retry a failed WhatsApp message
 * Returns true if retry was successful, false if max retries reached
 */
export async function retryFailedMessage(logId: string): Promise<{
  success: boolean;
  newLogId?: string;
  error?: string;
  retryCount: number;
}> {
  const supabase = getSupabase();

  // Fetch the failed log entry
  const { data: log, error: fetchError } = await supabase
    .from("whatsapp_logs")
    .select("*")
    .eq("id", logId)
    .single();

  if (fetchError || !log) {
    return { success: false, error: "Log not found", retryCount: 0 };
  }

  const retryCount = (log.retry_count as number) ?? 0;

  if (retryCount >= MAX_RETRIES) {
    return {
      success: false,
      error: "Max retries reached",
      retryCount,
    };
  }

  // Fetch booking details if booking_id exists
  let booking: BookingForMessage | null = null;
  let config = null;

  if (log.booking_id) {
    const { data: bookingRow } = await supabase
      .from("bookings")
      .select(`
        id, business_id, total_amount, advance_paid,
        booking_date, booking_time, duration_minutes,
        custom_data,
        customers(name, phone),
        services(name),
        staff(users(name)),
        businesses(name, address, phone, slug, google_review_link)
      `)
      .eq("id", log.booking_id)
      .single();

    if (bookingRow) {
      const bookerName =
        (bookingRow as { custom_data?: { customer_name?: string } })?.custom_data?.customer_name;
      booking = {
        id: bookingRow.id,
        business_id: bookingRow.business_id,
        customer_name: bookerName ?? (bookingRow as any).customers?.name ?? "Customer",
        customer_phone: (bookingRow as any).customers?.phone ?? "",
        service_name: (bookingRow as any).services?.name ?? "Service",
        staff_name: (bookingRow as any).staff?.users?.name ?? "Staff",
        booking_date: bookingRow.booking_date,
        booking_time: bookingRow.booking_time,
        duration_minutes: bookingRow.duration_minutes,
        total_amount: bookingRow.total_amount,
        advance_paid: bookingRow.advance_paid,
        business_name: (bookingRow as any).businesses?.name ?? "",
        business_address: (bookingRow as any).businesses?.address ?? "",
        business_phone: (bookingRow as any).businesses?.phone ?? "",
        business_slug: (bookingRow as any).businesses?.slug ?? "",
        google_review_link: (bookingRow as any).businesses?.google_review_link ?? "",
      };

      config = await getBusinessConfig(bookingRow.business_id);
    }
  }

  // Wait before retry (exponential backoff)
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (retryCount + 1)));

  // Reconstruct send options
  const sendOptions: SendOptions = {
    businessId: log.business_id,
    to: log.customer_phone,
    messageType: log.message_type as any,
    variables: booking
      ? {
          customer_name: booking.customer_name,
          customer_phone: booking.customer_phone,
          service_name: booking.service_name,
          staff_name: booking.staff_name,
          date: booking.booking_date,
          time: booking.booking_time,
          duration_mins: booking.duration_minutes,
          business_name: booking.business_name,
          business_address: booking.business_address ?? "",
          business_phone: booking.business_phone ?? "",
          advance_amount: booking.advance_paid,
          remaining_amount: booking.total_amount - booking.advance_paid,
          total_amount: booking.total_amount,
          cancellation_link: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/booking/${booking.id}`,
          visit_count: 1,
        }
      : {},
    config: config ?? ({} as any),
    bookingId: log.booking_id ?? undefined,
    templateUsed: log.template_used ?? undefined,
    customMessage: log.message_body,
  };

  // Attempt retry
  const result = await sendWhatsApp({
    ...sendOptions,
    retryCount: retryCount + 1,
    parentLogId: logId,
  });

  return {
    success: result.success,
    newLogId: result.logId,
    error: result.error,
    retryCount: retryCount + 1,
  };
}

/**
 * Process all failed messages that need retry
 * Called by cron job or manual trigger
 */
export async function processFailedMessages(): Promise<{
  processed: number;
  successful: number;
  failed: number;
}> {
  const supabase = getSupabase();

  // Find all failed messages with retry_count < 3
  const { data: failedLogs, error } = await supabase
    .from("whatsapp_logs")
    .select("id")
    .in("status", ["failed", "undelivered"])
    .lt("retry_count", MAX_RETRIES)
    .order("sent_at", { ascending: true })
    .limit(100); // Process in batches

  if (error || !failedLogs || failedLogs.length === 0) {
    return { processed: 0, successful: 0, failed: 0 };
  }

  let successful = 0;
  let failed = 0;

  for (const log of failedLogs) {
    const result = await retryFailedMessage(log.id);
    if (result.success) {
      successful++;
    } else {
      failed++;
    }
  }

  return {
    processed: failedLogs.length,
    successful,
    failed,
  };
}
