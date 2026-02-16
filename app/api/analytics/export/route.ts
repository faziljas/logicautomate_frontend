// ============================================================
// POST /api/analytics/export
// Export analytics as PDF or Excel (CSV).
// Body: { businessId, start, end, format: 'pdf' | 'csv' }
// ============================================================

import { NextRequest } from "next/server";
import {
  getSessionAndBusiness,
  unauthorized,
  badRequest,
  jsonResponse,
} from "@/lib/dashboard/api-helpers";
import {
  calculateRevenue,
  getBookingStats,
  getCustomerMetrics,
  getTopServices,
  getStaffPerformance,
  getOperationalMetrics,
  getDateRange,
} from "@/lib/analytics/calculators";
import {
  generateTextReport,
  generateCSVReport,
  type ReportData,
} from "@/lib/analytics/report-generator";

export async function POST(request: NextRequest) {
  const { session, business, supabase, isOwner, error } =
    await getSessionAndBusiness();

  if (error || !session || !business || !supabase) {
    return unauthorized();
  }
  if (!isOwner) {
    return jsonResponse({ error: "Forbidden" }, { status: 403 });
  }

  let body: { businessId: string; start?: string; end?: string; format?: "pdf" | "csv" };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const { businessId, start, end, format = "csv" } = body;
  if (!businessId || businessId !== business.id) {
    return badRequest("businessId required");
  }

  const preset = "month";
  const range = start && end ? { start, end } : getDateRange(preset);

  try {
    const [revenue, bookings, customers, services, staff, operational] = await Promise.all([
      calculateRevenue(supabase, businessId, range.start, range.end),
      getBookingStats(supabase, businessId, range.start, range.end),
      getCustomerMetrics(supabase, businessId, range.start, range.end),
      getTopServices(supabase, businessId, range.start, range.end),
      getStaffPerformance(supabase, businessId, range.start, range.end),
      getOperationalMetrics(supabase, businessId, range.start, range.end),
    ]);

    const reportData: ReportData = {
      businessName: business.name ?? "Business",
      dateRange: range,
      generatedAt: new Date().toISOString(),
      revenue: {
        totalRevenue: revenue.totalRevenue,
        averageTransactionValue: revenue.averageTransactionValue,
        advanceVsFullRatio: { advancePercent: revenue.advanceVsFullRatio.advancePercent },
        revenueTrend: revenue.revenueTrend.map((r) => ({ date: r.date, revenue: r.revenue })),
        revenueByService: revenue.revenueByService.map((s) => ({ serviceName: s.serviceName, revenue: s.revenue })),
        revenueByStaff: revenue.revenueByStaff.map((s) => ({ staffName: s.staffName, revenue: s.revenue })),
        paymentMethodsBreakdown: revenue.paymentMethodsBreakdown.map((p) => ({ method: p.method, amount: p.amount })),
      },
      bookings: {
        totalBookings: bookings.totalBookings,
        cancellationRate: bookings.cancellationRate,
        noShowRate: bookings.noShowRate,
        statusDistribution: bookings.statusDistribution.map((s) => ({ status: s.status, count: s.count })),
        peakHours: bookings.peakHoursHeatmap,
        peakDays: bookings.peakDays.map((d) => ({ dayName: d.dayName, count: d.count })),
      },
      customers: {
        totalCustomers: customers.totalCustomers,
        newCustomersThisMonth: customers.newCustomersThisMonth,
        repeatCustomersPercent: customers.repeatCustomersPercent,
        averageCLV: customers.averageCLV,
        inactiveCount: customers.inactiveCount,
        mostLoyal: customers.mostLoyalCustomers.map((c) => ({ customerName: c.customerName, visitCount: c.visitCount })),
      },
      services: {
        mostPopular: services.mostPopular.map((s) => ({ serviceName: s.serviceName, bookingCount: s.bookingCount })),
        mostProfitable: services.mostProfitable.map((s) => ({ serviceName: s.serviceName, revenue: s.revenue })),
        utilizationRate: services.utilizationRate,
      },
      staff: {
        bookingsPerStaff: staff.bookingsPerStaff.map((s) => ({ staffName: s.staffName, bookings: s.bookings })),
        revenuePerStaff: staff.revenuePerStaff.map((s) => ({ staffName: s.staffName, revenue: s.revenue })),
        utilizationRate: staff.utilizationRate.map((s) => ({ staffName: s.staffName, percent: s.percent })),
      },
      operational: {
        avgBookingLeadTimeDays: operational.avgBookingLeadTimeDays,
        sameDayBookingsPercent: operational.sameDayBookingsPercent,
        bookingCompletionRate: operational.bookingCompletionRate,
      },
    };

    if (format === "csv") {
      const csv = generateCSVReport(reportData);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="bookflow-analytics-${range.start}-${range.end}.csv"`,
        },
      });
    }

    // PDF: return text report as placeholder (jsPDF/Puppeteer requires additional setup)
    const text = generateTextReport(reportData);
    return new Response(text, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="bookflow-analytics-${range.start}-${range.end}.txt"`,
      },
    });
  } catch (err) {
    console.error("[analytics/export]", err);
    return jsonResponse({ error: "Failed to generate report" }, { status: 500 });
  }
}
