"use client";

// ============================================================
// BookFlow — Date & Time Picker
// Calendar + Time slots (Morning/Afternoon/Evening)
// "⚡ 3 people viewing" when others active
// ============================================================

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sun, Sunset, Moon, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PERIOD_META = {
  morning: { label: "Morning", icon: Sun, color: "text-amber-500" },
  afternoon: { label: "Afternoon", icon: Sunset, color: "text-orange-500" },
  evening: { label: "Evening", icon: Moon, color: "text-indigo-500" },
} as const;

interface TimeSlot {
  time: string;
  available: boolean;
  label: string;
}

interface SlotsByPeriod {
  morning: TimeSlot[];
  afternoon: TimeSlot[];
  evening: TimeSlot[];
}

interface DateTimePickerProps {
  businessId: string;
  serviceId: string;
  staffId: string;
  selectedDate: string | null;
  selectedTime: string | null;
  onSelectDate: (d: string) => void;
  onSelectTime: (t: string) => void;
  advanceDays?: number;
  minNoticeHours?: number;
  primaryColor?: string;
  viewingCount?: number;
}

export function DateTimePicker({
  businessId,
  serviceId,
  staffId,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  advanceDays = 30,
  minNoticeHours = 1,
  primaryColor = "#7C3AED",
  viewingCount = 0,
}: DateTimePickerProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [slots, setSlots] = useState<SlotsByPeriod | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalAvailable, setTotalAvailable] = useState(0);

  const minDate = new Date(today.getTime() + minNoticeHours * 60 * 60 * 1000);
  minDate.setHours(0, 0, 0, 0);
  const maxDate = new Date(today.getTime() + advanceDays * 24 * 60 * 60 * 1000);

  function toYMD(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function isDisabled(d: Date): boolean {
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    return start < minDate || start > maxDate;
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const canGoPrev = !(
    viewYear === today.getFullYear() && viewMonth === today.getMonth()
  );

  useEffect(() => {
    if (!businessId || !serviceId || !staffId || !selectedDate) return;
    setLoading(true);
    setError(null);
    fetch("/api/bookings/check-availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        serviceId,
        staffId,
        date: selectedDate,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setSlots(data.slots);
        setTotalAvailable(data.totalAvailable ?? 0);
      })
      .catch(() => setError("Failed to load availability"))
      .finally(() => setLoading(false));
  }, [businessId, serviceId, staffId, selectedDate]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-900">Select Date & Time</h2>

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() =>
              viewMonth === 0
                ? (setViewYear((y) => y - 1), setViewMonth(11))
                : setViewMonth((m) => m - 1)
            }
            disabled={!canGoPrev}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <p className="font-bold text-sm text-gray-800">
            {MONTHS[viewMonth]} {viewYear}
          </p>
          <button
            onClick={() =>
              viewMonth === 11
                ? (setViewYear((y) => y + 1), setViewMonth(0))
                : setViewMonth((m) => m + 1)
            }
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-center text-xs font-semibold text-gray-400 py-1"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, idx) => {
            if (!date)
              return <div key={`empty-${idx}`} />;
            const ymd = toYMD(date);
            const disabled = isDisabled(date);
            const isToday = ymd === toYMD(today);
            const isSelected = ymd === selectedDate;
            return (
              <button
                key={ymd}
                disabled={disabled}
                onClick={() => !disabled && onSelectDate(ymd)}
                className={cn(
                  "relative aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-all m-0.5",
                  disabled && "text-gray-200 cursor-not-allowed",
                  !disabled &&
                    (isSelected
                      ? "text-white shadow-md"
                      : isToday
                      ? "border-2 text-current hover:bg-gray-100"
                      : "text-gray-700 hover:bg-gray-100")
                )}
                style={
                  isSelected
                    ? { backgroundColor: primaryColor, borderColor: primaryColor }
                    : isToday
                    ? { borderColor: primaryColor, color: primaryColor }
                    : undefined
                }
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <>
          {viewingCount > 0 && (
            <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-amber-50 border border-amber-100">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-800">
                {viewingCount} people viewing
              </span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading slots…</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-sm text-red-500 bg-red-50 rounded-xl">
              {error}
            </div>
          ) : slots ? (
            <div className="space-y-5">
              {(["morning", "afternoon", "evening"] as const).map((period) => {
                const periodSlots = slots[period];
                const available = periodSlots.filter((s) => s.available);
                if (periodSlots.length === 0) return null;
                const Meta = PERIOD_META[period];
                const Icon = Meta.icon;
                return (
                  <div key={period}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon className={cn("w-4 h-4", Meta.color)} />
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {Meta.label}
                      </p>
                      <span className="text-xs text-gray-400">
                        ({available.length}/{periodSlots.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {periodSlots.map((slot) => (
                        <SlotButton
                          key={slot.time}
                          slot={slot}
                          selected={selectedTime === slot.time}
                          onSelect={onSelectTime}
                          primaryColor={primaryColor}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function SlotButton({
  slot,
  selected,
  onSelect,
  primaryColor,
}: {
  slot: TimeSlot;
  selected: boolean;
  onSelect: (t: string) => void;
  primaryColor: string;
}) {
  const [locked, setLocked] = useState(false);
  const unavailable = !slot.available || locked;

  function handleClick() {
    if (!slot.available || locked) return;
    setLocked(true);
    onSelect(slot.time);
    setTimeout(() => setLocked(false), 10_000);
  }

  return (
    <button
      onClick={handleClick}
      disabled={unavailable && !selected}
      className={cn(
        "py-2.5 rounded-xl text-xs font-semibold border-2 transition-all",
        selected
          ? "text-white shadow-md"
          : slot.available
          ? "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
          : "border-transparent bg-gray-100 text-gray-300 cursor-not-allowed line-through"
      )}
      style={
        selected
          ? { backgroundColor: primaryColor, borderColor: primaryColor }
          : undefined
      }
    >
      {slot.label}
    </button>
  );
}
