// ============================================================
// BookFlow — Analytics Realtime
// Subscribe to payments/bookings for live dashboard updates.
// Enable replication for `payments` in Supabase Dashboard:
//   Database → Replication → public.payments
// ============================================================

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Subscribe to new/updated payments for live revenue counter updates.
 */
export function subscribeToPayments(
  businessId: string,
  onPayment: () => void
): () => void {
  const supabase = createClientComponentClient();
  const channel = supabase
    .channel(`analytics:payments:${businessId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "payments",
        filter: `business_id=eq.${businessId}`,
      },
      (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const newRecord = payload.new as { status?: string };
          if (newRecord?.status === "completed") {
            onPayment();
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to completed bookings for live analytics updates.
 */
export function subscribeToCompletedBookings(
  businessId: string,
  onCompleted: () => void
): () => void {
  const supabase = createClientComponentClient();
  const channel = supabase
    .channel(`analytics:bookings:${businessId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "bookings",
        filter: `business_id=eq.${businessId}`,
      },
      (payload) => {
        const newRecord = payload.new as { status?: string };
        if (newRecord?.status === "completed") {
          onCompleted();
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
