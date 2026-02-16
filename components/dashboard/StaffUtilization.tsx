"use client";

// ============================================================
// StaffUtilization — Staff busy % bars for today
// ============================================================

import React from "react";
import { cn } from "@/lib/utils";

interface StaffUtil {
  staffId: string;
  name: string;
  roleName: string;
  busyMinutes: number;
  utilizationPercent: number;
}

interface Props {
  utilization: StaffUtil[];
}

export default function StaffUtilization({ utilization }: Props) {
  if (utilization.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Staff Utilization</h2>
        <p className="text-sm text-slate-500">No staff data for today</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900 mb-3">Staff Utilization</h2>
      <p className="text-xs text-slate-500 mb-4">% of 8-hour day booked today</p>
      <div className="space-y-3">
        {utilization.map((s) => (
          <div key={s.staffId}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-slate-700">{s.name}</span>
              <span className="text-slate-500">{s.utilizationPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  s.utilizationPercent >= 80 ? "bg-emerald-500" : "bg-violet-500"
                )}
                style={{ width: `${Math.min(100, s.utilizationPercent)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
