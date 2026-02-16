// ============================================================
// BookFlow — Cleanup Expired Bookings (Cron Job)
// lib/cron/cleanup-expired-bookings.ts
// ============================================================
// Called by:
//   1. Vercel Cron (vercel.json): every minute in production
//   2. GET /api/cron/cleanup-expired (protected with CRON_SECRET)
// ============================================================

import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export interface CleanupResult {
  cancelledCount:  number;
  cancelledIds:    string[];
  ranAt:           string;
}

/**
 * Cancels all pending bookings whose booking_expires_at has passed.
 * Returns the count and IDs of cancelled bookings.
 */
export async function cleanupExpiredBookings(): Promise<CleanupResult> {
  const supabase = getAdmin();
  const now      = new Date().toISOString();

  // Fetch expired pending bookings
  const { data: expired, error: fetchErr } = await supabase
    .from("bookings")
    .select("id, business_id, customer_id, service_id, booking_date, booking_time")
    .eq("status", "pending")
    .not("booking_expires_at", "is", null)
    .lt("booking_expires_at", now);

  if (fetchErr) {
    throw new Error(`Failed to fetch expired bookings: ${fetchErr.message}`);
  }

  if (!expired || expired.length === 0) {
    return { cancelledCount: 0, cancelledIds: [], ranAt: now };
  }

  const expiredIds = expired.map((b: { id: string }) => b.id);

  // Cancel them all in one update
  const { error: updateErr } = await supabase
    .from("bookings")
    .update({
      status:              "cancelled",
      cancellation_reason: "Payment not completed — booking expired",
    })
    .in("id", expiredIds);

  if (updateErr) {
    throw new Error(`Failed to cancel expired bookings: ${updateErr.message}`);
  }

  // Also cancel their pending payments
  await supabase
    .from("payments")
    .update({ status: "failed" })
    .in("booking_id", expiredIds)
    .eq("status", "pending");

  console.log(`[cleanup] Cancelled ${expiredIds.length} expired bookings:`, expiredIds);

  return {
    cancelledCount: expiredIds.length,
    cancelledIds:   expiredIds,
    ranAt:          now,
  };
}
