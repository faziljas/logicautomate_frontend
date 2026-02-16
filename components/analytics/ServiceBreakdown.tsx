"use client";

// ============================================================
// ServiceBreakdown — Pie chart for revenue by service
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

interface ServiceItem {
  serviceName: string;
  serviceId: string;
  revenue: number;
  count: number;
}

interface ServiceBreakdownProps {
  data: ServiceItem[];
  title?: string;
  height?: number;
  valueLabel?: string; // e.g. "Revenue" or "Bookings"
}

const COLORS = [
  "#7c3aed",
  "#0d9488",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ServiceBreakdown({
  data,
  title = "Revenue by Service",
  height = 300,
  valueLabel = "Revenue",
}: ServiceBreakdownProps) {
  const chartData = data.map((d) => ({
    name: d.serviceName,
    value: d.revenue || d.count,
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
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) =>
                valueLabel === "Bookings" ? value : formatCurrency(value)
              }
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
