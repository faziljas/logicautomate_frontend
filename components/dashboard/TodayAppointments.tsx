"use client";

// ============================================================
// TodayAppointments — Today's appointment list with quick actions
// ============================================================

import React, { useState } from "react";
import {
  Check,
  X,
  Bell,
  Loader2,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

interface Booking {
  id: string;
  booking_time: string;
  duration_minutes: number;
  status: BookingStatus;
  customers: { name: string; phone?: string } | null;
  services: { name: string } | null;
  staff: { users: { name: string } | null; role_name?: string } | null;
}

interface Props {
  bookings: Booking[];
  businessId: string;
  onAction?: () => void;
  onAddWalkIn?: () => void;
  canMarkComplete?: boolean;
  canCancel?: boolean;
}

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-red-100 text-red-800",
};

function formatTime(t: string) {
  return new Date(`2000-01-01T${t}`).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TodayAppointments({
  bookings,
  businessId,
  onAction,
  onAddWalkIn,
  canMarkComplete = true,
  canCancel = true,
}: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleStatusUpdate = async (bookingId: string, status: "completed" | "cancelled") => {
    setLoadingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "cancelled" && { cancellationReason: "Cancelled by staff" }),
        }),
      });
      if (res.ok) onAction?.();
      else {
        const d = await res.json();
        alert(d.error ?? "Failed");
      }
    } catch (e) {
      alert("Something went wrong");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReminder = async (bookingId: string) => {
    setLoadingId(bookingId);
    try {
      const res = await fetch("/api/whatsapp/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      if (res.ok) alert("Reminder sent!");
      else {
        const d = await res.json();
        alert(d.error ?? "Failed to send");
      }
    } catch (e) {
      alert("Something went wrong");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">Today&apos;s Appointments</h2>
        {onAddWalkIn && (
          <button
            onClick={onAddWalkIn}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            <UserPlus className="w-4 h-4" /> Add Walk-in
          </button>
        )}
      </div>
      <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
        {bookings.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500 text-sm">
            No appointments today
          </div>
        ) : (
          bookings.map((b) => (
            <div
              key={b.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-900">
                    {formatTime(b.booking_time)}
                  </span>
                  <span
                    className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                      STATUS_STYLES[b.status as BookingStatus] ?? "bg-slate-100 text-slate-700"
                    )}
                  >
                    {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-slate-900 font-medium mt-0.5">
                  {b.customers?.name ?? "—"}
                </p>
                <p className="text-xs text-slate-500">
                  {b.services?.name ?? "—"} • {(b.staff?.users as { name?: string })?.name ?? b.staff?.role_name ?? "Staff"}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {loadingId === b.id ? (
                  <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                ) : (
                  <>
                    {b.status === "confirmed" && canMarkComplete && (
                      <button
                        onClick={() => handleStatusUpdate(b.id, "completed")}
                        className="p-2 rounded-lg hover:bg-emerald-100 text-emerald-600"
                        title="Mark complete"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {["pending", "confirmed"].includes(b.status) && canCancel && (
                      <button
                        onClick={() => handleStatusUpdate(b.id, "cancelled")}
                        className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {["pending", "confirmed"].includes(b.status) && (
                      <button
                        onClick={() => handleReminder(b.id)}
                        className="p-2 rounded-lg hover:bg-violet-100 text-violet-600"
                        title="Send reminder"
                      >
                        <Bell className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
