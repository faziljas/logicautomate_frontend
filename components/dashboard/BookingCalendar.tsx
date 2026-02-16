"use client";

// ============================================================
// BookingCalendar — Day/Week/Month view of bookings
// ============================================================

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "day" | "week" | "month";

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  duration_minutes: number;
  status: string;
  total_amount?: number;
  customers: { name: string; phone?: string; email?: string } | null;
  services: { name: string } | null;
  staff: { users: { name: string } | null; role_name?: string } | null;
}

interface Props {
  bookings: Booking[];
  onDateChange?: (date: string) => void;
  onBookingClick?: (booking: Booking) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(t: string) {
  return new Date(`2000-01-01T${t}`).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BookingCalendar({
  bookings,
  onDateChange,
  onBookingClick,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });

  const { startDate, endDate, gridDates } = useMemo(() => {
    const d = new Date(currentDate);
    let start: Date;
    let end: Date;

    if (viewMode === "day") {
      start = new Date(d);
      end = new Date(d);
    } else if (viewMode === "week") {
      const day = d.getDay();
      start = new Date(d);
      start.setDate(d.getDate() - day);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else {
      start = new Date(d.getFullYear(), d.getMonth(), 1);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    }

    const dates: string[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      dates.push(curr.toISOString().split("T")[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      gridDates: dates,
    };
  }, [currentDate, viewMode]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    bookings.forEach((b) => {
      const d = b.booking_date;
      if (!map[d]) map[d] = [];
      map[d].push(b);
    });
    Object.keys(map).forEach((d) =>
      map[d].sort((a, b) => a.booking_time.localeCompare(b.booking_time))
    );
    return map;
  }, [bookings]);

  const goPrev = () => {
    const d = new Date(currentDate);
    if (viewMode === "day") d.setDate(d.getDate() - 1);
    else if (viewMode === "week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d.toISOString().split("T")[0]);
    onDateChange?.(d.toISOString().split("T")[0]);
  };

  const goNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "day") d.setDate(d.getDate() + 1);
    else if (viewMode === "week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d.toISOString().split("T")[0]);
    onDateChange?.(d.toISOString().split("T")[0]);
  };

  const title =
    viewMode === "day"
      ? new Date(currentDate).toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : viewMode === "week"
      ? `${new Date(gridDates[0]).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${new Date(gridDates[gridDates.length - 1]).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
      : new Date(currentDate).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-slate-900 min-w-[200px] text-center">
            {title}
          </h2>
          <button
            onClick={goNext}
            className="p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {(["day", "week", "month"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium capitalize",
                viewMode === m
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        {viewMode === "month" ? (
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-slate-500 py-1">
                {d}
              </div>
            ))}
            {gridDates.map((d) => {
              const dayBookings = bookingsByDate[d] ?? [];
              const isToday = d === new Date().toISOString().split("T")[0];
              return (
                <div
                  key={d}
                  className={cn(
                    "min-h-[80px] rounded-lg border p-1",
                    isToday ? "border-violet-500 bg-violet-50/50" : "border-slate-100"
                  )}
                >
                  <span className="text-xs font-medium text-slate-600">
                    {new Date(d).getDate()}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayBookings.slice(0, 3).map((b) => (
                      <button
                        key={b.id}
                        onClick={() => onBookingClick?.(b)}
                        className={cn(
                          "block w-full text-left text-xs truncate rounded px-1 py-0.5",
                          b.status === "completed"
                            ? "bg-slate-200 text-slate-600"
                            : b.status === "cancelled"
                            ? "bg-red-100 text-red-700 line-through"
                            : "bg-violet-100 text-violet-800 hover:bg-violet-200"
                        )}
                      >
                        {formatTime(b.booking_time)} {b.customers?.name ?? "—"}
                      </button>
                    ))}
                    {dayBookings.length > 3 && (
                      <span className="text-xs text-slate-400">+{dayBookings.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {gridDates.map((d) => {
              const dayBookings = bookingsByDate[d] ?? [];
              return (
                <div key={d} className="rounded-lg border border-slate-100 overflow-hidden">
                  <div className="bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
                    {new Date(d).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {dayBookings.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-slate-400">No bookings</div>
                    ) : (
                      dayBookings.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => onBookingClick?.(b)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
                        >
                          <span className="text-sm font-medium text-slate-900 w-16 shrink-0">
                            {formatTime(b.booking_time)}
                          </span>
                          <span className="text-sm text-slate-700 flex-1 truncate">
                            {b.customers?.name ?? "—"}
                          </span>
                          <span className="text-xs text-slate-500 truncate">
                            {b.services?.name ?? "—"}
                          </span>
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              b.status === "completed" && "bg-slate-100 text-slate-600",
                              b.status === "confirmed" && "bg-emerald-100 text-emerald-700",
                              b.status === "pending" && "bg-amber-100 text-amber-700",
                              b.status === "cancelled" && "bg-red-100 text-red-700"
                            )}
                          >
                            {b.status}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
