"use client";

// ============================================================
// MetricsGrid — KPI cards for analytics dashboard
// ============================================================

import React from "react";
import {
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  Percent,
  Clock,
  Target,
} from "lucide-react";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  variant?: "default" | "success" | "warning";
}

function MetricCard({ title, value, subtext, icon, trend, variant = "default" }: MetricCardProps) {
  const colors = {
    default: "bg-violet-50 text-violet-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {subtext && <p className="mt-0.5 text-xs text-slate-400">{subtext}</p>}
          {trend && (
            <p className={`mt-2 text-xs font-medium ${trend.value >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {trend.value >= 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={`rounded-lg p-2 ${colors[variant]}`}>{icon}</div>
      </div>
    </div>
  );
}

interface MetricsGridProps {
  revenue: {
    totalRevenue: number;
    averageTransactionValue: number;
    advanceVsFullRatio: { advancePercent: number };
  };
  bookings: {
    totalBookings: number;
    cancellationRate: number;
    noShowRate: number;
    bookingCompletionRate?: number;
  };
  customers: {
    totalCustomers: number;
    newCustomersThisMonth: number;
    repeatCustomersPercent: number;
    averageCLV: number;
    inactiveCount: number;
  };
  operational?: {
    avgBookingLeadTimeDays: number;
    sameDayBookingsPercent: number;
    bookingCompletionRate: number;
  };
}

export default function MetricsGrid({
  revenue,
  bookings,
  customers,
  operational,
}: MetricsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <MetricCard
        title="Total Revenue"
        value={formatCurrency(revenue.totalRevenue)}
        subtext="Completed bookings"
        icon={<DollarSign className="h-5 w-5" />}
        variant="success"
      />
      <MetricCard
        title="Avg Transaction"
        value={formatCurrency(revenue.averageTransactionValue)}
        subtext="Per completed booking"
        icon={<TrendingUp className="h-5 w-5" />}
      />
      <MetricCard
        title="Advance Payment %"
        value={`${revenue.advanceVsFullRatio.advancePercent.toFixed(1)}%`}
        subtext="Of total payments"
        icon={<Percent className="h-5 w-5" />}
      />
      <MetricCard
        title="Total Bookings"
        value={bookings.totalBookings}
        subtext="In date range"
        icon={<Calendar className="h-5 w-5" />}
      />
      <MetricCard
        title="Cancellation Rate"
        value={`${bookings.cancellationRate.toFixed(1)}%`}
        icon={<Target className="h-5 w-5" />}
        variant={bookings.cancellationRate > 15 ? "warning" : "default"}
      />
      <MetricCard
        title="No-Show Rate"
        value={`${bookings.noShowRate.toFixed(1)}%`}
        icon={<Target className="h-5 w-5" />}
        variant={bookings.noShowRate > 10 ? "warning" : "default"}
      />
      <MetricCard
        title="Total Customers"
        value={customers.totalCustomers}
        subtext="All-time"
        icon={<Users className="h-5 w-5" />}
      />
      <MetricCard
        title="New This Month"
        value={customers.newCustomersThisMonth}
        subtext="First-time customers"
        icon={<Users className="h-5 w-5" />}
        variant="success"
      />
      <MetricCard
        title="Repeat Customers"
        value={`${customers.repeatCustomersPercent.toFixed(1)}%`}
        subtext="2+ visits"
        icon={<Users className="h-5 w-5" />}
      />
      <MetricCard
        title="Avg Customer Value"
        value={formatCurrency(customers.averageCLV)}
        subtext="Lifetime value"
        icon={<DollarSign className="h-5 w-5" />}
      />
      <MetricCard
        title="Inactive Customers"
        value={customers.inactiveCount}
        subtext="No visit in 60+ days"
        icon={<Users className="h-5 w-5" />}
        variant={customers.inactiveCount > 50 ? "warning" : "default"}
      />
      {operational && (
        <>
          <MetricCard
            title="Avg Lead Time"
            value={`${operational.avgBookingLeadTimeDays} days`}
            subtext="Booking in advance"
            icon={<Clock className="h-5 w-5" />}
          />
          <MetricCard
            title="Same-Day %"
            value={`${operational.sameDayBookingsPercent.toFixed(1)}%`}
            subtext="Booked same day"
            icon={<Calendar className="h-5 w-5" />}
          />
          <MetricCard
            title="Completion Rate"
            value={`${operational.bookingCompletionRate.toFixed(1)}%`}
            subtext="Completed vs total"
            icon={<Target className="h-5 w-5" />}
            variant="success"
          />
        </>
      )}
    </div>
  );
}
