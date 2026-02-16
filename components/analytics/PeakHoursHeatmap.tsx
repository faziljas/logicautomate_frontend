"use client";

// ============================================================
// PeakHoursHeatmap — Heatmap showing which hours get most bookings
// ============================================================

import React from "react";

interface HourCount {
  hour: number;
  count: number;
}

interface PeakHoursHeatmapProps {
  data: HourCount[];
  title?: string;
}

export default function PeakHoursHeatmap({
  data,
  title = "Peak Hours",
}: PeakHoursHeatmapProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const hourMap = Object.fromEntries(data.map((d) => [d.hour, d.count]));

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayLabels = ["12am", "3am", "6am", "9am", "12pm", "3pm", "6pm", "9pm"];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>
      <div className="grid grid-cols-12 gap-1">
        {hours.map((hour) => {
          const count = hourMap[hour] ?? 0;
          const intensity = maxCount > 0 ? count / maxCount : 0;
          const bg =
            intensity === 0
              ? "bg-slate-100"
              : intensity < 0.33
                ? "bg-violet-200"
                : intensity < 0.66
                  ? "bg-violet-400"
                  : "bg-violet-600";
          const textColor = intensity > 0.5 ? "text-white" : "text-slate-700";
          return (
            <div
              key={hour}
              className={`flex flex-col items-center justify-center rounded px-1 py-2 ${bg} ${textColor}`}
              title={`${hour}:00 - ${count} bookings`}
            >
              <span className="text-xs font-medium">{hour}</span>
              <span className="text-[10px]">{count}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>12am</span>
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>11pm</span>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Darker = more bookings. Hover for details.
      </p>
    </div>
  );
}
