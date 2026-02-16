"use client";

// ============================================================
// BookFlow — Analytics Dashboard
// Comprehensive analytics: revenue, bookings, customers, services, staff
// ============================================================

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Download,
  Mail,
  Calendar,
  Radio,
  ChevronDown,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import {
  MetricsGrid,
  RevenueChart,
  ServiceBreakdown,
  StaffPerformance,
  PeakHoursHeatmap,
  BookingStatusChart,
  PeakDaysChart,
} from "@/components/analytics";
import { subscribeToPayments } from "@/lib/analytics/realtime";

type Preset = "today" | "week" | "month" | "custom";

interface AnalyticsData {
  dateRange: { start: string; end: string };
  revenue: {
    totalRevenue: number;
    revenueTrend: { date: string; revenue: number; bookings: number }[];
    revenueByService: { serviceName: string; serviceId: string; revenue: number; count: number }[];
    revenueByStaff: { staffName: string; staffId: string; revenue: number; count: number }[];
    paymentMethodsBreakdown: { method: string; amount: number; count: number }[];
    averageTransactionValue: number;
    advanceVsFullRatio: { advance: number; full: number; advancePercent: number };
  };
  bookings: {
    totalBookings: number;
    statusDistribution: { status: string; count: number; percent: number }[];
    cancellationRate: number;
    noShowRate: number;
    peakHoursHeatmap: { hour: number; count: number }[];
    peakDays: { day: number; dayName: string; count: number }[];
  };
  customers: {
    totalCustomers: number;
    newCustomersThisMonth: number;
    repeatCustomersPercent: number;
    retentionRate: number;
    averageCLV: number;
    mostLoyalCustomers: { customerName: string; customerId: string; visitCount: number }[];
    inactiveCount: number;
  };
  services: {
    mostPopular: { serviceName: string; serviceId: string; bookingCount: number }[];
    mostProfitable: { serviceName: string; serviceId: string; revenue: number }[];
    utilizationRate: number;
  };
  staff: {
    bookingsPerStaff: { staffName: string; staffId: string; bookings: number }[];
    revenuePerStaff: { staffName: string; staffId: string; revenue: number }[];
    utilizationRate: { staffName: string; staffId: string; percent: number }[];
  };
  operational: {
    avgBookingLeadTimeDays: number;
    sameDayBookingsPercent: number;
    bookingCompletionRate: number;
  };
}

export default function AnalyticsPage() {
  const { business, role, loading: ctxLoading } = useDashboard();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>("week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const fetchData = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      businessId: business.id,
      preset: preset === "custom" ? "month" : preset,
    });
    if (preset === "custom" && customStart && customEnd) {
      params.set("start", customStart);
      params.set("end", customEnd);
    }
    try {
      const res = await fetch(`/api/analytics/overview?${params}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [business?.id, preset, customStart, customEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!business?.id || role !== "owner") return;
    const unsubscribe = subscribeToPayments(business.id, () => {
      setIsLive(true);
      fetchData();
      setTimeout(() => setIsLive(false), 3000);
    });
    return unsubscribe;
  }, [business?.id, role, fetchData]);

  const handleExport = async (format: "csv" | "pdf") => {
    if (!business?.id) return;
    setExportLoading(true);
    try {
      const params = preset === "custom" && customStart && customEnd
        ? { start: customStart, end: customEnd }
        : {};
      const res = await fetch("/api/analytics/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          format,
          ...params,
        }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const ext = format === "csv" ? "csv" : "txt";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookflow-analytics-${data?.dateRange.start ?? ""}-${data?.dateRange.end ?? ""}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Export failed. Try again.");
    } finally {
      setExportLoading(false);
    }
  };

  const dateLabel =
    preset === "today"
      ? "Today"
      : preset === "week"
        ? "This Week"
        : preset === "month"
          ? "This Month"
          : customStart && customEnd
            ? `${customStart} – ${customEnd}`
            : "Custom";

  if (ctxLoading || !business) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (role !== "owner") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p className="font-medium">Access restricted</p>
        <p className="mt-1 text-sm">Analytics are available only to business owners.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
          {isLive && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Radio className="h-3 w-3 animate-pulse" /> Live
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Calendar className="h-4 w-4" />
              {dateLabel}
              <ChevronDown className="h-4 w-4" />
            </button>
            {showDatePicker && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDatePicker(false)}
                  aria-hidden="true"
                />
                <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                  {["today", "week", "month"].map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setPreset(p as Preset);
                        setShowDatePicker(false);
                      }}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                        preset === p ? "bg-violet-50 font-medium text-violet-700" : "text-slate-700"
                      }`}
                    >
                      {p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
                    </button>
                  ))}
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <p className="mb-2 text-xs font-medium text-slate-500">Custom range</p>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => {
                          setCustomStart(e.target.value);
                          setPreset("custom");
                        }}
                        className="flex-1 rounded border border-slate-200 px-2 py-1.5 text-sm"
                      />
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => {
                          setCustomEnd(e.target.value);
                          setPreset("custom");
                        }}
                        className="flex-1 rounded border border-slate-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (customStart && customEnd) {
                          setShowDatePicker(false);
                          fetchData();
                        }
                      }}
                      className="mt-2 w-full rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => handleExport("csv")}
            disabled={exportLoading}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {exportLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export
          </button>
          <button
            onClick={() => setEmailModalOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Mail className="h-4 w-4" />
            Email Report
          </button>
        </div>
      </div>

      {emailModalOpen && (
        <EmailReportModal
          onClose={() => setEmailModalOpen(false)}
          businessId={business.id}
          dateRange={data?.dateRange}
        />
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      ) : data ? (
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Key Metrics</h2>
            <MetricsGrid
              revenue={data.revenue}
              bookings={data.bookings}
              customers={data.customers}
              operational={data.operational}
            />
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Revenue Analytics</h2>
            <div className="space-y-6">
              <RevenueChart data={data.revenue.revenueTrend} />
              <div className="grid gap-6 lg:grid-cols-2">
                <ServiceBreakdown
                  data={data.revenue.revenueByService}
                  title="Revenue by Service"
                />
                <StaffPerformance
                  revenueData={data.revenue.revenueByStaff}
                  bookingsData={data.staff.bookingsPerStaff}
                  mode="revenue"
                />
              </div>
              {data.revenue.paymentMethodsBreakdown.length > 0 && (
                <ServiceBreakdown
                  data={data.revenue.paymentMethodsBreakdown.map((p) => ({
                    serviceName: p.method,
                    serviceId: p.method,
                    revenue: p.amount,
                    count: p.count,
                  }))}
                  title="Payment Methods"
                />
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Booking Analytics</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <BookingStatusChart data={data.bookings.statusDistribution} />
              <PeakDaysChart data={data.bookings.peakDays} />
            </div>
            <div className="mt-6">
              <PeakHoursHeatmap data={data.bookings.peakHoursHeatmap} />
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Service & Staff Analytics</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <ServiceBreakdown
                data={data.services.mostPopular.map((s) => ({
                  serviceName: s.serviceName,
                  serviceId: s.serviceId,
                  revenue: s.bookingCount,
                  count: s.bookingCount,
                }))}
                title="Most Popular Services (by bookings)"
                valueLabel="Bookings"
              />
              <StaffPerformance
                revenueData={data.staff.revenuePerStaff}
                bookingsData={data.staff.bookingsPerStaff}
                mode="both"
              />
            </div>
          </section>

          {data.customers.mostLoyalCustomers.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Most Loyal Customers</h2>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="pb-2 font-medium">Customer</th>
                        <th className="pb-2 font-medium">Visits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.customers.mostLoyalCustomers.slice(0, 10).map((c) => (
                        <tr key={c.customerId} className="border-b border-slate-100">
                          <td className="py-2">{c.customerName}</td>
                          <td className="py-2">{c.visitCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          No analytics data available for this period.
        </div>
      )}
    </div>
  );
}

function EmailReportModal({
  onClose,
  businessId,
  dateRange,
}: {
  onClose: () => void;
  businessId: string;
  dateRange?: { start: string; end: string };
}) {
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("weekly");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/email-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          email: email.trim(),
          frequency,
          dateRange: dateRange ?? undefined,
        }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error ?? "Failed to schedule report");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Schedule Email Report</h3>
        <p className="mt-2 text-sm text-slate-500">
          Get analytics reports delivered to your inbox weekly or monthly.
        </p>
        {sent ? (
          <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-emerald-700">
            <p className="font-medium">Report scheduled!</p>
            <p className="mt-1 text-sm">
              You will receive reports at <strong>{email}</strong> {frequency === "weekly" ? "every week" : "every month"}.
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Frequency</label>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="frequency"
                    value="weekly"
                    checked={frequency === "weekly"}
                    onChange={() => setFrequency("weekly")}
                  />
                  <span className="text-sm">Weekly</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="frequency"
                    value="monthly"
                    checked={frequency === "monthly"}
                    onChange={() => setFrequency("monthly")}
                  />
                  <span className="text-sm">Monthly</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {loading ? "Saving…" : "Schedule"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
