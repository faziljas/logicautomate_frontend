"use client";

// ============================================================
// StaffPerformance — Bar chart for revenue/bookings by staff
// Uses Recharts
// ============================================================

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface StaffItem {
  staffName: string;
  staffId: string;
  revenue: number;
  bookings?: number;
}

interface StaffPerformanceProps {
  revenueData: StaffItem[];
  bookingsData?: { staffName: string; staffId: string; bookings: number }[];
  mode?: "revenue" | "bookings" | "both";
  height?: number;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function StaffPerformance({
  revenueData,
  bookingsData = [],
  mode = "revenue",
  height = 300,
}: StaffPerformanceProps) {
  const byStaff = new Map<string, { staffName: string; revenue: number; bookings: number }>();
  revenueData.forEach((s) => {
    byStaff.set(s.staffId, {
      staffName: s.staffName,
      revenue: s.revenue,
      bookings: s.bookings ?? 0,
    });
  });
  bookingsData.forEach((s) => {
    const existing = byStaff.get(s.staffId);
    if (existing) existing.bookings = s.bookings;
    else byStaff.set(s.staffId, { staffName: s.staffName, revenue: 0, bookings: s.bookings });
  });
  const chartData = Array.from(byStaff.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-slate-900">
        Staff Performance
      </h3>
      {chartData.length === 0 ? (
        <div
          className="flex items-center justify-center text-slate-400"
          style={{ height }}
        >
          No data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              tickFormatter={(v) =>
                mode === "bookings" ? v : `${(v / 1000).toFixed(0)}k`
              }
              tick={{ fontSize: 12 }}
              stroke="#64748b"
            />
            <YAxis
              type="category"
              dataKey="staffName"
              width={75}
              tick={{ fontSize: 11 }}
              stroke="#64748b"
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                name === "revenue" ? formatCurrency(value) : value,
                name === "revenue" ? "Revenue" : "Bookings",
              ]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            />
            <Legend />
            {mode !== "bookings" && (
              <Bar dataKey="revenue" name="Revenue" fill="#7c3aed" radius={[0, 4, 4, 0]} />
            )}
            {mode !== "revenue" && (
              <Bar dataKey="bookings" name="Bookings" fill="#0d9488" radius={[0, 4, 4, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
