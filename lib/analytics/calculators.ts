// ============================================================
// BookFlow — Analytics Calculators
// Aggregates data from Supabase for analytics dashboard.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RevenueMetrics,
  BookingMetrics,
  CustomerMetrics,
  ServiceMetrics,
  StaffMetrics,
  OperationalMetrics,
} from "./types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getDateRange(preset: "today" | "week" | "month", custom?: { start: string; end: string }) {
  if (custom) return { start: custom.start, end: custom.end };
  const end = new Date();
  const start = new Date();
  if (preset === "today") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (preset === "week") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else {
    // month
    start.setMonth(start.getMonth() - 1);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export async function calculateRevenue(
  supabase: SupabaseClient,
  businessId: string,
  startDate: string,
  endDate: string
): Promise<RevenueMetrics> {
  // Fetch completed bookings with payments
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, booking_date, total_amount, advance_paid, status, service_id, staff_id")
    .eq("business_id", businessId)
    .eq("status", "completed")
    .gte("booking_date", startDate)
    .lte("booking_date", endDate);

  const completedBookings = bookings ?? [];
  const bookingIds = completedBookings.map((b) => b.id);

  let completedPayments: { id: string; amount: number; payment_method: string; booking_id: string; is_advance?: boolean }[] = [];
  if (bookingIds.length > 0) {
    const { data: payments } = await supabase
      .from("payments")
      .select("id, amount, payment_method, booking_id, is_advance")
      .eq("business_id", businessId)
      .eq("status", "completed")
      .in("booking_id", bookingIds);
    completedPayments = payments ?? [];
  }

  const totalRevenue = completedBookings.reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0);

  // Revenue trend by date
  const trendByDate: Record<string, { revenue: number; bookings: number }> = {};
  const dates: string[] = [];
  const d1 = new Date(startDate);
  const d2 = new Date(endDate);
  for (let d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    dates.push(dateStr);
    trendByDate[dateStr] = { revenue: 0, bookings: 0 };
  }
  completedBookings.forEach((b) => {
    const date = b.booking_date;
    if (trendByDate[date]) {
      trendByDate[date].revenue += Number(b.total_amount ?? 0);
      trendByDate[date].bookings += 1;
    }
  });
  const revenueTrend = dates.map((date) => ({
    date,
    revenue: trendByDate[date]?.revenue ?? 0,
    bookings: trendByDate[date]?.bookings ?? 0,
  }));

  // Revenue by service (need service names)
  const serviceIds = Array.from(new Set(completedBookings.map((b) => b.service_id).filter(Boolean)));
  const { data: services } = serviceIds.length
    ? await supabase.from("services").select("id, name").in("id", serviceIds)
    : { data: [] };
  const serviceMap = Object.fromEntries((services ?? []).map((s) => [s.id, s.name ?? "Unknown"]));
  const revenueByService: Record<string, { serviceName: string; revenue: number; count: number }> = {};
  completedBookings.forEach((b) => {
    const sid = b.service_id ?? "unknown";
    const name = serviceMap[sid] ?? "Unknown";
    if (!revenueByService[sid]) revenueByService[sid] = { serviceName: name, revenue: 0, count: 0 };
    revenueByService[sid].revenue += Number(b.total_amount ?? 0);
    revenueByService[sid].count += 1;
  });
  const revenueByServiceArr = Object.entries(revenueByService).map(([id, v]) => ({
    serviceId: id,
    serviceName: v.serviceName,
    revenue: v.revenue,
    count: v.count,
  }));

  // Revenue by staff
  const staffIds = Array.from(new Set(completedBookings.map((b) => b.staff_id).filter(Boolean)));
  const { data: staffRows } = staffIds.length
    ? await supabase.from("staff").select("id, users(name)").in("id", staffIds)
    : { data: [] };
  const staffMap = Object.fromEntries(
    (staffRows ?? []).map((s) => [s.id, (s.users as { name?: string })?.name ?? "Staff"])
  );
  const revenueByStaff: Record<string, { staffName: string; revenue: number; count: number }> = {};
  completedBookings.forEach((b) => {
    const sid = b.staff_id ?? "unknown";
    const name = staffMap[sid] ?? "Unknown";
    if (!revenueByStaff[sid]) revenueByStaff[sid] = { staffName: name, revenue: 0, count: 0 };
    revenueByStaff[sid].revenue += Number(b.total_amount ?? 0);
    revenueByStaff[sid].count += 1;
  });
  const revenueByStaffArr = Object.entries(revenueByStaff).map(([id, v]) => ({
    staffId: id,
    staffName: v.staffName,
    revenue: v.revenue,
    count: v.count,
  }));

  // Payment methods
  const pmBreakdown: Record<string, { amount: number; count: number }> = {};
  completedPayments.forEach((p) => {
    const m = p.payment_method ?? "other";
    if (!pmBreakdown[m]) pmBreakdown[m] = { amount: 0, count: 0 };
    pmBreakdown[m].amount += Number(p.amount ?? 0);
    pmBreakdown[m].count += 1;
  });
  const paymentMethodsBreakdown = Object.entries(pmBreakdown).map(([method, v]) => ({
    method,
    amount: v.amount,
    count: v.count,
  }));

  const avgTx = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0;

  let advanceTotal = 0;
  let fullTotal = 0;
  completedPayments.forEach((p) => {
    if (p.is_advance) advanceTotal += Number(p.amount ?? 0);
    else fullTotal += Number(p.amount ?? 0);
  });
  const advanceVsTotal = advanceTotal + fullTotal;
  const advancePercent = advanceVsTotal > 0 ? (advanceTotal / advanceVsTotal) * 100 : 0;

  return {
    totalRevenue,
    revenueTrend,
    revenueByService: revenueByServiceArr,
    revenueByStaff: revenueByStaffArr,
    paymentMethodsBreakdown,
    averageTransactionValue: avgTx,
    advanceVsFullRatio: { advance: advanceTotal, full: fullTotal, advancePercent },
  };
}

export async function getBookingStats(
  supabase: SupabaseClient,
  businessId: string,
  startDate: string,
  endDate: string
): Promise<BookingMetrics> {
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, booking_date, booking_time, status, created_at")
    .eq("business_id", businessId)
    .gte("booking_date", startDate)
    .lte("booking_date", endDate);

  const all = bookings ?? [];
  const total = all.length;

  const statusCounts: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};
  const dayCounts: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourCounts[h] = 0;
  for (let d = 0; d < 7; d++) dayCounts[d] = 0;

  all.forEach((b) => {
    statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1;
    const hour = parseInt(String(b.booking_time ?? "0").split(":")[0], 10);
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
    const day = new Date(b.booking_date).getDay();
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  });

  const confirmed = statusCounts.confirmed ?? 0;
  const completed = statusCounts.completed ?? 0;
  const cancelled = statusCounts.cancelled ?? 0;
  const noShow = statusCounts.no_show ?? 0;

  const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    percent: total > 0 ? (count / total) * 100 : 0,
  }));

  const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0;
  const noShowRate = total > 0 ? (noShow / total) * 100 : 0;

  const peakHoursHeatmap = Object.entries(hourCounts).map(([h, c]) => ({ hour: parseInt(h, 10), count: c }));
  const peakDays = Object.entries(dayCounts).map(([d, c]) => ({
    day: parseInt(d, 10),
    dayName: DAY_NAMES[parseInt(d, 10)],
    count: c,
  }));

  return {
    totalBookings: total,
    statusDistribution,
    cancellationRate,
    noShowRate,
    peakHoursHeatmap,
    peakDays,
  };
}

export async function getCustomerMetrics(
  supabase: SupabaseClient,
  businessId: string,
  startDate: string,
  endDate: string
): Promise<CustomerMetrics> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: allCustomers } = await supabase
    .from("customers")
    .select("id, created_at")
    .eq("business_id", businessId);

  const { data: newCustomersThisMonth } = await supabase
    .from("customers")
    .select("id")
    .eq("business_id", businessId)
    .gte("created_at", `${monthStart}T00:00:00`);

  const { data: completedBookings } = await supabase
    .from("bookings")
    .select("customer_id")
    .eq("business_id", businessId)
    .eq("status", "completed")
    .gte("booking_date", startDate)
    .lte("booking_date", endDate);

  const { data: allCompletedForCLV } = await supabase
    .from("bookings")
    .select("customer_id, total_amount")
    .eq("business_id", businessId)
    .eq("status", "completed");

  const visitCount: Record<string, number> = {};
  (completedBookings ?? []).forEach((b) => {
    visitCount[b.customer_id] = (visitCount[b.customer_id] ?? 0) + 1;
  });

  const totalUnique = Object.keys(visitCount).length;
  const repeatCount = Object.values(visitCount).filter((c) => c >= 2).length;
  const repeatPercent = totalUnique > 0 ? (repeatCount / totalUnique) * 100 : 0;

  const totalCustomers = allCustomers?.length ?? 0;
  const newThisMonth = newCustomersThisMonth?.length ?? 0;

  const retentionRate = totalUnique > 0 ? (repeatCount / totalUnique) * 100 : 0;

  const revenueByCustomer: Record<string, number> = {};
  (allCompletedForCLV ?? []).forEach((b) => {
    revenueByCustomer[b.customer_id] = (revenueByCustomer[b.customer_id] ?? 0) + Number(b.total_amount ?? 0);
  });
  const customersWithRevenue = Object.keys(revenueByCustomer).length;
  const totalRev = Object.values(revenueByCustomer).reduce((a, b) => a + b, 0);
  const avgCLV = customersWithRevenue > 0 ? totalRev / customersWithRevenue : 0;

  const customerIds = Object.keys(visitCount);
  const { data: custNames } =
    customerIds.length > 0
      ? await supabase.from("customers").select("id, name").in("id", customerIds)
      : { data: [] };
  const nameMap = Object.fromEntries((custNames ?? []).map((c) => [c.id, c.name ?? "Unknown"]));

  const mostLoyal = Object.entries(visitCount)
    .map(([id, count]) => ({ customerId: id, customerName: nameMap[id] ?? "Unknown", visitCount: count }))
    .sort((a, b) => b.visitCount - a.visitCount)
    .slice(0, 10);

  const { data: lastVisitRows } = await supabase
    .from("bookings")
    .select("customer_id")
    .eq("business_id", businessId)
    .eq("status", "completed")
    .gte("booking_date", sixtyDaysAgo)
    .order("booking_date", { ascending: false });

  const activeIn60Days = new Set((lastVisitRows ?? []).map((r) => r.customer_id));
  const allCustIds = (allCustomers ?? []).map((c) => c.id);
  const inactiveCount = allCustIds.filter((id) => !activeIn60Days.has(id)).length;

  return {
    totalCustomers,
    newCustomersThisMonth: newThisMonth,
    repeatCustomersPercent: repeatPercent,
    retentionRate,
    averageCLV: avgCLV,
    mostLoyalCustomers: mostLoyal,
    inactiveCount,
  };
}

export async function getTopServices(
  supabase: SupabaseClient,
  businessId: string,
  startDate: string,
  endDate: string
): Promise<ServiceMetrics> {
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, service_id, total_amount, duration_minutes")
    .eq("business_id", businessId)
    .in("status", ["completed", "confirmed"])
    .gte("booking_date", startDate)
    .lte("booking_date", endDate);

  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration_minutes")
    .eq("business_id", businessId)
    .eq("is_active", true);

  const serviceMap = Object.fromEntries((services ?? []).map((s) => [s.id, s]));
  const byService: Record<string, { count: number; revenue: number; durationSum: number; estSum: number }> = {};

  (bookings ?? []).forEach((b) => {
    const sid = b.service_id ?? "unknown";
    if (!byService[sid]) byService[sid] = { count: 0, revenue: 0, durationSum: 0, estSum: 0 };
    byService[sid].count += 1;
    byService[sid].revenue += Number(b.total_amount ?? 0);
    byService[sid].durationSum += Number(b.duration_minutes ?? 0);
    const est = serviceMap[sid]?.duration_minutes ?? b.duration_minutes ?? 0;
    byService[sid].estSum += Number(est);
  });

  const mostPopular = Object.entries(byService)
    .map(([id, v]) => ({
      serviceId: id,
      serviceName: serviceMap[id]?.name ?? "Unknown",
      bookingCount: v.count,
    }))
    .sort((a, b) => b.bookingCount - a.bookingCount)
    .slice(0, 10);

  const mostProfitable = Object.entries(byService)
    .map(([id, v]) => ({
      serviceId: id,
      serviceName: serviceMap[id]?.name ?? "Unknown",
      revenue: v.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const totalSlots = (services ?? []).length * 30;
  const totalBookings = (bookings ?? []).length;
  const utilizationRate = totalSlots > 0 ? Math.min(100, (totalBookings / totalSlots) * 100) : 0;

  let avgActual = 0;
  let avgEst = 0;
  let n = 0;
  Object.values(byService).forEach((v) => {
    if (v.count > 0) {
      avgActual += v.durationSum / v.count;
      avgEst += v.estSum / v.count;
      n += 1;
    }
  });
  if (n > 0) {
    avgActual /= n;
    avgEst /= n;
  }

  return {
    mostPopular,
    mostProfitable,
    utilizationRate,
    avgDurationActual: avgActual || undefined,
    avgDurationEstimated: avgEst || undefined,
  };
}

export async function getStaffPerformance(
  supabase: SupabaseClient,
  businessId: string,
  startDate: string,
  endDate: string
): Promise<StaffMetrics> {
  const { data: staffRows } = await supabase
    .from("staff")
    .select("id, users(name), role_name, working_hours")
    .eq("business_id", businessId)
    .eq("is_active", true);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("staff_id, total_amount, duration_minutes")
    .eq("business_id", businessId)
    .in("status", ["completed", "confirmed", "pending"])
    .gte("booking_date", startDate)
    .lte("booking_date", endDate);

  const staffMap = Object.fromEntries(
    (staffRows ?? []).map((s) => [s.id, (s.users as { name?: string })?.name ?? "Staff"])
  );

  const byStaff: Record<string, { bookings: number; revenue: number; minutes: number }> = {};
  (staffRows ?? []).forEach((s) => {
    byStaff[s.id] = { bookings: 0, revenue: 0, minutes: 0 };
  });
  (bookings ?? []).forEach((b) => {
    const sid = b.staff_id ?? "unknown";
    if (!byStaff[sid]) byStaff[sid] = { bookings: 0, revenue: 0, minutes: 0 };
    byStaff[sid].bookings += 1;
    byStaff[sid].revenue += Number(b.total_amount ?? 0);
    byStaff[sid].minutes += Number(b.duration_minutes ?? 0);
  });

  const WORK_DAY_MINUTES = 8 * 60;
  const daysInRange = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000)) + 1;

  const bookingsPerStaff = Object.entries(byStaff).map(([id, v]) => ({
    staffId: id,
    staffName: staffMap[id] ?? "Unknown",
    bookings: v.bookings,
  }));

  const revenuePerStaff = Object.entries(byStaff).map(([id, v]) => ({
    staffId: id,
    staffName: staffMap[id] ?? "Unknown",
    revenue: v.revenue,
  }));

  const utilizationRate = Object.entries(byStaff).map(([id, v]) => {
    const totalMinutes = WORK_DAY_MINUTES * daysInRange;
    const pct = totalMinutes > 0 ? Math.min(100, (v.minutes / totalMinutes) * 100) : 0;
    return {
      staffId: id,
      staffName: staffMap[id] ?? "Unknown",
      percent: Math.round(pct),
    };
  });

  return {
    bookingsPerStaff,
    revenuePerStaff,
    utilizationRate,
  };
}

export async function getOperationalMetrics(
  supabase: SupabaseClient,
  businessId: string,
  startDate: string,
  endDate: string
): Promise<OperationalMetrics> {
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, booking_date, created_at, status")
    .eq("business_id", businessId)
    .gte("booking_date", startDate)
    .lte("booking_date", endDate);

  const all = bookings ?? [];
  const completed = all.filter((b) => b.status === "completed").length;
  const completionRate = all.length > 0 ? (completed / all.length) * 100 : 0;

  let leadTimeSum = 0;
  let leadTimeCount = 0;
  let sameDayCount = 0;
  all.forEach((b) => {
    const bookDate = new Date(b.booking_date).getTime();
    const created = new Date(b.created_at).getTime();
    const leadDays = Math.floor((bookDate - created) / (24 * 60 * 60 * 1000));
    leadTimeSum += leadDays;
    leadTimeCount += 1;
    if (leadDays === 0) sameDayCount += 1;
  });
  const avgLeadTime = leadTimeCount > 0 ? leadTimeSum / leadTimeCount : 0;
  const sameDayPercent = all.length > 0 ? (sameDayCount / all.length) * 100 : 0;

  return {
    avgBookingLeadTimeDays: Math.round(avgLeadTime * 10) / 10,
    sameDayBookingsPercent: Math.round(sameDayPercent * 10) / 10,
    bookingCompletionRate: Math.round(completionRate * 10) / 10,
  };
}
