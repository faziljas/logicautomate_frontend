"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  selectedDate:    string | null; // YYYY-MM-DD
  onSelect:        (date: string) => void;
  advanceDays?:    number;  // how far ahead to allow booking
  minNoticeHours?: number;  // minimum advance notice in hours
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export function DatePicker({
  selectedDate,
  onSelect,
  advanceDays    = 30,
  minNoticeHours = 1,
}: DatePickerProps) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-based

  // Min bookable date = today + minNoticeHours
  const minDate = new Date(today.getTime() + minNoticeHours * 60 * 60 * 1000);
  minDate.setHours(0, 0, 0, 0);

  // Max bookable date = today + advanceDays
  const maxDate = new Date(today.getTime() + advanceDays * 24 * 60 * 60 * 1000);

  function toYMD(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function isDisabled(d: Date): boolean {
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    return start < minDate || start > maxDate;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i + 1)),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const canGoPrev = !(viewYear === today.getFullYear() && viewMonth === today.getMonth());

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Select a Date</h2>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            disabled={!canGoPrev}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <p className="font-bold text-sm text-gray-800">
            {MONTHS[viewMonth]} {viewYear}
          </p>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Date grid */}
        <div className="grid grid-cols-7">
          {cells.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} />;
            }

            const ymd       = toYMD(date);
            const disabled  = isDisabled(date);
            const isToday   = ymd === toYMD(today);
            const isSelected = ymd === selectedDate;

            return (
              <button
                key={ymd}
                disabled={disabled}
                onClick={() => !disabled && onSelect(ymd)}
                className={cn(
                  "relative aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-all duration-100 m-0.5",
                  disabled
                    ? "text-gray-200 cursor-not-allowed"
                    : isSelected
                    ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                    : isToday
                    ? "border-2 border-violet-300 text-violet-600 hover:bg-violet-50"
                    : "text-gray-700 hover:bg-violet-50 hover:text-violet-600"
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <p className="mt-3 text-sm text-center font-medium text-violet-600">
          📅 {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
            weekday: "long",
            day:     "numeric",
            month:   "long",
            year:    "numeric",
          })}
        </p>
      )}
    </div>
  );
}
