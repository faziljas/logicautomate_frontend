"use client";

// ============================================================
// RevenueChart — Line chart for revenue trends
// Uses Recharts
// ============================================================

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DataPoint {
  date: string;
  revenue: number;
  bookings: number;
}

interface RevenueChartProps {
  data: DataPoint[];
  height?: number;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function RevenueChart({ data, height = 300 }: RevenueChartProps) {
  const displayData = data.map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    }),
  }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-slate-900">
        Revenue Trend
      </h3>
      {displayData.length === 0 ? (
        <div
          className="flex items-center justify-center text-slate-400"
          style={{ height }}
        >
          No data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={displayData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 12 }}
              stroke="#64748b"
            />
            <YAxis
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 12 }}
              stroke="#64748b"
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                name === "revenue" ? formatCurrency(value) : value,
                name === "revenue" ? "Revenue" : "Bookings",
              ]}
              labelFormatter={(label) => `Date: ${label}`}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={{ fill: "#7c3aed", r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="bookings"
              name="Bookings"
              stroke="#0d9488"
              strokeWidth={2}
              dot={{ fill: "#0d9488", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
