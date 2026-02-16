"use client";

// ============================================================
// StatsCard — Dashboard stat display with optional comparison
// ============================================================

import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  changePercent?: number;
  changeLabel?: string;
  className?: string;
}

export default function StatsCard({ title, value, icon: Icon, changePercent, changeLabel, className }: Props) {
  const isPositive = changePercent !== undefined && changePercent >= 0;
  const isNegative = changePercent !== undefined && changePercent < 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {changePercent !== undefined && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                isPositive && "text-emerald-600",
                isNegative && "text-red-600"
              )}
            >
              {isPositive && "+"}
              {changePercent}% {changeLabel ?? "vs yesterday"}
            </p>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-violet-50 p-2.5">
            <Icon className="w-5 h-5 text-violet-600" />
          </div>
        )}
      </div>
    </div>
  );
}
