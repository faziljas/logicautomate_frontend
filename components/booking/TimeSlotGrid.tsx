"use client";
import { useEffect, useState } from "react";
import { Loader2, Sun, Sunset, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SlotsByPeriod, TimeSlot } from "@/lib/booking/availability-checker";

interface TimeSlotGridProps {
  businessId:      string;
  serviceId:       string;
  staffId:         string;
  date:            string;
  selectedTime:    string | null;
  onSelect:        (time: string) => void;
}

const PERIOD_META = {
  morning:   { label: "Morning",   icon: Sun,    color: "text-amber-500" },
  afternoon: { label: "Afternoon", icon: Sunset,  color: "text-orange-500" },
  evening:   { label: "Evening",   icon: Moon,    color: "text-indigo-500" },
} as const;

export function TimeSlotGrid({
  businessId,
  serviceId,
  staffId,
  date,
  selectedTime,
  onSelect,
}: TimeSlotGridProps) {
  const [slots,    setSlots]    = useState<SlotsByPeriod | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [total,    setTotal]    = useState(0);

  useEffect(() => {
    if (!businessId || !serviceId || !staffId || !date) return;

    setLoading(true);
    setError(null);
    setSlots(null);

    fetch("/api/bookings/check-availability", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ businessId, serviceId, staffId, date }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setSlots(data.slots);
        setTotal(data.totalAvailable ?? 0);
      })
      .catch(() => setError("Failed to load availability"))
      .finally(() => setLoading(false));
  }, [businessId, serviceId, staffId, date]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading available slots…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-sm text-red-500 bg-red-50 rounded-xl">
        {error}
      </div>
    );
  }

  if (!slots) return null;

  const hasAny = total > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Select a Time</h2>
        {hasAny ? (
          <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
            {total} slot{total !== 1 ? "s" : ""} available
          </span>
        ) : (
          <span className="text-xs font-semibold bg-red-100 text-red-600 px-2.5 py-1 rounded-full">
            Fully booked
          </span>
        )}
      </div>

      {!hasAny ? (
        <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <p className="text-3xl mb-2">😔</p>
          <p className="text-sm font-semibold text-gray-700">No slots available on this date</p>
          <p className="text-xs text-gray-400 mt-1">Try a different date or staff member</p>
        </div>
      ) : (
        <div className="space-y-5">
          {(["morning", "afternoon", "evening"] as const).map((period) => {
            const periodSlots = slots[period];
            const available   = periodSlots.filter((s) => s.available);
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
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SlotButton({
  slot,
  selected,
  onSelect,
}: {
  slot:     TimeSlot;
  selected: boolean;
  onSelect: (time: string) => void;
}) {
  // Optimistic lock: once selected, show as locked even before API responds
  const [optimisticallyLocked, setOptimisticallyLocked] = useState(false);

  function handleClick() {
    if (!slot.available || optimisticallyLocked) return;
    setOptimisticallyLocked(true);
    onSelect(slot.time);
    // Reset after 10s in case the user changes their mind
    setTimeout(() => setOptimisticallyLocked(false), 10_000);
  }

  const isUnavailable = !slot.available || optimisticallyLocked;

  return (
    <button
      onClick={handleClick}
      disabled={isUnavailable && !selected}
      className={cn(
        "py-2.5 rounded-xl text-xs font-semibold border-2 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
        selected
          ? "bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-200 scale-105"
          : slot.available
          ? "border-gray-200 bg-white text-gray-700 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50"
          : "border-transparent bg-gray-100 text-gray-300 cursor-not-allowed line-through"
      )}
    >
      {slot.label}
    </button>
  );
}
