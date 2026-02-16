"use client";

// ============================================================
// AnalyticsCharts — Revenue trends, popular services, etc.
// Uses CSS-based simple charts (no heavy chart lib for perf)
// ============================================================

import React from "react";
import { TrendingUp, BarChart3, Users, Clock } from "lucide-react";

interface RevenuePoint {
  date: string;
  amount: number;
}

interface ServiceCount {
  name: string;
  count: number;
}

interface Props {
  revenueTrend?: RevenuePoint[];
  popularServices?: ServiceCount[];
  retentionRate?: number;
  peakHours?: number[];
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AnalyticsCharts({
  revenueTrend = [],
  popularServices = [],
  retentionRate = 0,
  peakHours = [],
}: Props) {
  const maxRevenue = Math.max(...revenueTrend.map((r) => r.amount), 1);
  const maxCount = Math.max(...popularServices.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      {/* Revenue trend */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-violet-600" />
          Revenue trend (last 7 days)
        </h3>
        {revenueTrend.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
            No data
          </div>
        ) : (
          <div className="flex items-end gap-1 h-40">
            {revenueTrend.map((r, i) => (
              <div key={r.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-violet-500 rounded-t transition-all min-h-[4px]"
                  style={{
                    height: `${Math.max(4, (r.amount / maxRevenue) * 100)}%`,
                  }}
                />
                <span className="text-xs text-slate-500 truncate w-full text-center">
                  {new Date(r.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Popular services */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-violet-600" />
          Popular services
        </h3>
        {popularServices.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
            No data
          </div>
        ) : (
          <div className="space-y-3">
            {popularServices.slice(0, 8).map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{s.name}</span>
                  <span className="text-slate-500">{s.count} bookings</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full"
                    style={{ width: `${(s.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Retention & Peak */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-600" />
            Customer retention
          </h3>
          <p className="text-2xl font-bold text-violet-600">
            {retentionRate.toFixed(0)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Repeat visitors in last 30 days
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5 text-violet-600" />
            Peak hours
          </h3>
          <p className="text-lg font-medium text-slate-700">
            {peakHours.length > 0
              ? peakHours
                  .slice(0, 3)
                  .map((h) => `${h}:00`)
                  .join(", ")
              : "—"}
          </p>
          <p className="text-xs text-slate-500 mt-1">Most booked hours</p>
        </div>
      </div>
    </div>
  );
}
