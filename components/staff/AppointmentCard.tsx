"use client";

import React from "react";
import Link from "next/link";
import { Clock, User, Scissors, Phone, Play, Check, PhoneCall } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppointmentBooking {
  id: string;
  booking_date: string;
  booking_time: string;
  duration_minutes: number;
  end_time?: string;
  status: string;
  total_amount: number;
  advance_paid: number;
  special_requests?: string | null;
  customers: { id: string; name: string; phone?: string; email?: string } | null;
  services: { id: string; name: string; duration_minutes: number; price: number } | null;
  staff?: { id: string; users?: { name: string }; role_name: string } | null;
}

interface AppointmentCardProps {
  booking: AppointmentBooking;
  onStart?: (id: string) => void;
  onComplete?: (id: string) => void;
  compact?: boolean;
}

function formatTime(t: string): string {
  if (!t) return "";
  const part = t.slice(0, 5);
  return part;
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    pending: "Upcoming",
    confirmed: "Upcoming",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No show",
  };
  return map[s] || s;
}

function statusColor(s: string): string {
  if (s === "completed") return "bg-emerald-100 text-emerald-800";
  if (s === "cancelled" || s === "no_show") return "bg-slate-100 text-slate-600";
  return "bg-pink-100 text-pink-800";
}

export function AppointmentCard({ booking, onStart, onComplete, compact }: AppointmentCardProps) {
  const customer = booking.customers;
  const service = booking.services;
  const isUpcoming = ["pending", "confirmed"].includes(booking.status);
  const isCompleted = booking.status === "completed";

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
        compact && "p-3"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-slate-900">
              {formatTime(booking.booking_time)}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                statusColor(booking.status)
              )}
            >
              {statusLabel(booking.status)}
            </span>
          </div>
          <p className="mt-1 font-medium text-slate-800">
            {customer?.name ?? "Customer"}
          </p>
          <p className="text-sm text-slate-500">
            {service?.name ?? "Service"} · {booking.duration_minutes} min
          </p>
          {customer?.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="mt-1 flex items-center gap-1 text-sm text-pink-600"
            >
              <Phone className="h-3.5 w-3.5" />
              {customer.phone}
            </a>
          )}
        </div>
      </div>

      {!compact && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/staff/booking/${booking.id}`}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700"
          >
            View details
          </Link>
          {isUpcoming && onStart && (
            <button
              type="button"
              onClick={() => onStart(booking.id)}
              className="inline-flex items-center gap-1 rounded-lg bg-pink-500 px-3 py-2 text-sm font-medium text-white"
            >
              <Play className="h-4 w-4" />
              Start service
            </button>
          )}
          {isUpcoming && onComplete && (
            <button
              type="button"
              onClick={() => onComplete(booking.id)}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white"
            >
              <Check className="h-4 w-4" />
              Mark complete
            </button>
          )}
          {customer?.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            >
              <PhoneCall className="h-4 w-4" />
              Call
            </a>
          )}
        </div>
      )}
    </div>
  );
}
