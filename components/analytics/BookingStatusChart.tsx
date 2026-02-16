"use client";

// ============================================================
// BookingStatusChart — Status distribution (pie/bar)
// Uses Recharts
// ============================================================

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface StatusItem {
  status: string;
  count: number;
  percent: number;
}

interface BookingStatusChartProps {
  data: StatusItem[];
  title?: string;
  height?: number;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#22c55e",
  confirmed: "#3b82f6",
  pending: "#f59e0b",
  cancelled: "#ef4444",
  no_show: "#94a3b8",
};

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BookingStatusChart({
  data,
  title = "Booking Status",
  height = 280,
}: BookingStatusChartProps) {
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({
      name: formatStatus(d.status),
      value: d.count,
      fill: STATUS_COLORS[d.status] ?? "#7c3aed",
    }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>
      {chartData.length === 0 ? (
        <div
          className="flex items-center justify-center text-slate-400"
          style={{ height }}
        >
          No data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props?: { payload?: { value?: number } }) => {
                const total = chartData.reduce((a, d) => a + d.value, 0);
                const pct = total > 0 ? (((props?.payload?.value ?? value) / total) * 100).toFixed(1) : 0;
                return [`${value} (${pct}%)`, name];
              }}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
