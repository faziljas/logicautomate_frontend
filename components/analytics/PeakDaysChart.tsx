"use client";

// ============================================================
// PeakDaysChart — Bar chart for peak days of week
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
} from "recharts";

interface DayItem {
  day: number;
  dayName: string;
  count: number;
}

interface PeakDaysChartProps {
  data: DayItem[];
  title?: string;
  height?: number;
}

export default function PeakDaysChart({
  data,
  title = "Peak Days",
  height = 260,
}: PeakDaysChartProps) {
  const sorted = [...data].sort((a, b) => a.day - b.day);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>
      {sorted.length === 0 ? (
        <div
          className="flex items-center justify-center text-slate-400"
          style={{ height }}
        >
          No data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={sorted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dayName" tick={{ fontSize: 12 }} stroke="#64748b" />
            <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
              formatter={(value: number) => [`${value} bookings`, "Bookings"]}
            />
            <Bar dataKey="count" name="Bookings" fill="#7c3aed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
