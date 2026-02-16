// ============================================================
// BookFlow — Dashboard Stats Calculator
// Computes today's overview stats from raw data.
// ============================================================

export interface TodayStats {
  revenue: number;
  revenueYesterday: number;
  revenueChangePercent: number;
  bookingsCount: number;
  newCustomersCount: number;
  noShowsCount: number;
}

export interface BookingRow {
  id: string;
  total_amount: number;
  advance_paid?: number;
  status: string;
  created_at?: string;
  customer_id?: string;
}

export interface CustomerRow {
  id: string;
  created_at: string;
}

export function calculateTodayStats(
  todayBookings: BookingRow[],
  yesterdayBookings: BookingRow[],
  todayNewCustomers: CustomerRow[],
  todayDate: string
): TodayStats {
  const todayCompleted = todayBookings.filter((b) => b.status === "completed");
  const todayNoShows = todayBookings.filter((b) => b.status === "no_show");
  const revenue = todayCompleted.reduce((sum, b) => sum + Number(b.total_amount), 0);
  const revenueYesterday = yesterdayBookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + Number(b.total_amount), 0);
  const revenueChangePercent =
    revenueYesterday > 0
      ? Math.round(((revenue - revenueYesterday) / revenueYesterday) * 100)
      : revenue > 0 ? 100 : 0;

  return {
    revenue,
    revenueYesterday,
    revenueChangePercent,
    bookingsCount: todayBookings.length,
    newCustomersCount: todayNewCustomers.length,
    noShowsCount: todayNoShows.length,
  };
}

export function getTodayDateString(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}
