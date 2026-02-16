// ============================================================
// BookFlow — Analytics Report Generator
// Generates PDF reports for analytics export.
// Uses jsPDF for client-side or server-side PDF generation.
// ============================================================

export interface ReportData {
  businessName: string;
  dateRange: { start: string; end: string };
  generatedAt: string;
  revenue: {
    totalRevenue: number;
    averageTransactionValue: number;
    advanceVsFullRatio: { advancePercent: number };
    revenueTrend: { date: string; revenue: number }[];
    revenueByService: { serviceName: string; revenue: number }[];
    revenueByStaff: { staffName: string; revenue: number }[];
    paymentMethodsBreakdown: { method: string; amount: number }[];
  };
  bookings: {
    totalBookings: number;
    cancellationRate: number;
    noShowRate: number;
    statusDistribution: { status: string; count: number }[];
    peakHours: { hour: number; count: number }[];
    peakDays: { dayName: string; count: number }[];
  };
  customers: {
    totalCustomers: number;
    newCustomersThisMonth: number;
    repeatCustomersPercent: number;
    averageCLV: number;
    inactiveCount: number;
    mostLoyal: { customerName: string; visitCount: number }[];
  };
  services: {
    mostPopular: { serviceName: string; bookingCount: number }[];
    mostProfitable: { serviceName: string; revenue: number }[];
    utilizationRate: number;
  };
  staff: {
    bookingsPerStaff: { staffName: string; bookings: number }[];
    revenuePerStaff: { staffName: string; revenue: number }[];
    utilizationRate: { staffName: string; percent: number }[];
  };
  operational: {
    avgBookingLeadTimeDays: number;
    sameDayBookingsPercent: number;
    bookingCompletionRate: number;
  };
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Generate a simple text/markdown report (fallback when jsPDF not available)
 */
export function generateTextReport(data: ReportData): string {
  const lines: string[] = [];
  lines.push(`# ${data.businessName} — Analytics Report`);
  lines.push(`Period: ${data.dateRange.start} to ${data.dateRange.end}`);
  lines.push(`Generated: ${data.generatedAt}`);
  lines.push("");

  lines.push("## Revenue");
  lines.push(`- Total Revenue: ${formatCurrency(data.revenue.totalRevenue)}`);
  lines.push(`- Average Transaction: ${formatCurrency(data.revenue.averageTransactionValue)}`);
  lines.push(`- Advance Payment Ratio: ${data.revenue.advanceVsFullRatio.advancePercent.toFixed(1)}%`);
  lines.push("");

  lines.push("## Bookings");
  lines.push(`- Total: ${data.bookings.totalBookings}`);
  lines.push(`- Cancellation Rate: ${data.bookings.cancellationRate.toFixed(1)}%`);
  lines.push(`- No-Show Rate: ${data.bookings.noShowRate.toFixed(1)}%`);
  lines.push("");

  lines.push("## Customers");
  lines.push(`- Total: ${data.customers.totalCustomers}`);
  lines.push(`- New This Month: ${data.customers.newCustomersThisMonth}`);
  lines.push(`- Repeat %: ${data.customers.repeatCustomersPercent.toFixed(1)}%`);
  lines.push(`- Avg CLV: ${formatCurrency(data.customers.averageCLV)}`);
  lines.push(`- Inactive (>60 days): ${data.customers.inactiveCount}`);
  lines.push("");

  lines.push("## Services");
  lines.push(`- Utilization Rate: ${data.services.utilizationRate.toFixed(1)}%`);
  lines.push("Top by bookings:", ...data.services.mostPopular.slice(0, 5).map((s) => `  - ${s.serviceName}: ${s.bookingCount}`));
  lines.push("");

  lines.push("## Operational");
  lines.push(`- Avg Lead Time: ${data.operational.avgBookingLeadTimeDays} days`);
  lines.push(`- Same-Day %: ${data.operational.sameDayBookingsPercent.toFixed(1)}%`);
  lines.push(`- Completion Rate: ${data.operational.bookingCompletionRate.toFixed(1)}%`);

  return lines.join("\n");
}

/**
 * Generate CSV for Excel import
 */
export function generateCSVReport(data: ReportData): string {
  const rows: string[][] = [];
  rows.push(["Metric", "Value"]);
  rows.push(["Business", data.businessName]);
  rows.push(["Period Start", data.dateRange.start]);
  rows.push(["Period End", data.dateRange.end]);
  rows.push(["Generated", data.generatedAt]);
  rows.push([]);
  rows.push(["REVENUE", ""]);
  rows.push(["Total Revenue", formatCurrency(data.revenue.totalRevenue)]);
  rows.push(["Avg Transaction", formatCurrency(data.revenue.averageTransactionValue)]);
  rows.push(["Advance %", `${data.revenue.advanceVsFullRatio.advancePercent.toFixed(1)}%`]);
  rows.push([]);
  rows.push(["Revenue by Service", "Amount"]);
  data.revenue.revenueByService.forEach((s) => rows.push([s.serviceName, formatCurrency(s.revenue)]));
  rows.push([]);
  rows.push(["Revenue by Staff", "Amount"]);
  data.revenue.revenueByStaff.forEach((s) => rows.push([s.staffName, formatCurrency(s.revenue)]));
  rows.push([]);
  rows.push(["BOOKINGS", ""]);
  rows.push(["Total", String(data.bookings.totalBookings)]);
  rows.push(["Cancellation Rate", `${data.bookings.cancellationRate.toFixed(1)}%`]);
  rows.push(["No-Show Rate", `${data.bookings.noShowRate.toFixed(1)}%`]);
  rows.push([]);
  rows.push(["CUSTOMERS", ""]);
  rows.push(["Total", String(data.customers.totalCustomers)]);
  rows.push(["New This Month", String(data.customers.newCustomersThisMonth)]);
  rows.push(["Repeat %", `${data.customers.repeatCustomersPercent.toFixed(1)}%`]);
  rows.push(["Avg CLV", formatCurrency(data.customers.averageCLV)]);
  rows.push(["Inactive (>60d)", String(data.customers.inactiveCount)]);
  rows.push([]);
  rows.push(["OPERATIONAL", ""]);
  rows.push(["Avg Lead Time (days)", String(data.operational.avgBookingLeadTimeDays)]);
  rows.push(["Same-Day %", `${data.operational.sameDayBookingsPercent.toFixed(1)}%`]);
  rows.push(["Completion Rate", `${data.operational.bookingCompletionRate.toFixed(1)}%`]);

  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}
