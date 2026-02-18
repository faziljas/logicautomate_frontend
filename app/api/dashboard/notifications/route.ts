// ============================================================
// GET /api/dashboard/notifications
// Fetch recent bookings for notification dropdown
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { session, business, supabase, error } = await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(15, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));

  // Fetch recent bookings (last 15, ordered by created_at desc)
  const { data: bookings, error: fetchErr } = await supabase
    .from("bookings")
    .select(
      `
      id, booking_date, booking_time, status, created_at,
      custom_data,
      customers(id, name, phone),
      services(id, name)
    `
    )
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (fetchErr) {
    console.error("[dashboard/notifications]", fetchErr);
    return jsonResponse({ error: "Failed to fetch notifications" }, { status: 500 });
  }

  // Format notifications
  const notifications = (bookings ?? []).map((booking: any) => {
    const customerName = booking.custom_data?.customer_name ?? booking.customers?.name ?? "Customer";
    const serviceName = booking.services?.name ?? "Service";
    const createdAt = new Date(booking.created_at);
    const now = new Date();
    const hoursAgo = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
    
    let timeAgo = "";
    if (hoursAgo < 1) {
      const minutesAgo = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
      timeAgo = minutesAgo <= 1 ? "Just now" : `${minutesAgo} minutes ago`;
    } else if (hoursAgo < 24) {
      timeAgo = `${hoursAgo} hour${hoursAgo !== 1 ? "s" : ""} ago`;
    } else {
      const daysAgo = Math.floor(hoursAgo / 24);
      timeAgo = `${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago`;
    }

    return {
      id: booking.id,
      type: "booking",
      title: `New booking: ${customerName}`,
      message: `${serviceName} - ${booking.booking_date} at ${booking.booking_time}`,
      status: booking.status,
      timeAgo,
      createdAt: booking.created_at,
      bookingId: booking.id,
    };
  });

  // Count unread (bookings created in last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const unreadCount = notifications.filter(
    (n) => new Date(n.createdAt) > oneDayAgo
  ).length;

  return jsonResponse({
    notifications,
    unreadCount,
  });
}
