// ============================================================
// BookFlow — Supabase Realtime for Dashboard
// Subscribe to new bookings for notification badge.
// Enable replication for `bookings` in Supabase Dashboard:
//   Database → Replication → public.bookings
// ============================================================

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export function subscribeToNewBookings(
  businessId: string,
  onNewBooking: () => void
): () => void {
  const supabase = createClientComponentClient();
  const channel = supabase
    .channel(`bookings:${businessId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "bookings",
        filter: `business_id=eq.${businessId}`,
      },
      () => {
        onNewBooking();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
