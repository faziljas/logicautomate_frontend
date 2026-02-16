"use client";

// ============================================================
// BookingDetailsModal — Full booking details
// ============================================================

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  duration_minutes: number;
  status: string;
  total_amount: number;
  advance_paid?: number;
  special_requests?: string | null;
  customers: { name: string; phone?: string; email?: string } | null;
  services: { name: string; duration_minutes?: number; price?: number } | null;
  staff: { users: { name: string } | null; role_name?: string } | null;
}

interface Props {
  booking: Booking | null;
  onClose: () => void;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(t: string) {
  return new Date(`2000-01-01T${t}`).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(n);
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-red-100 text-red-800",
};

export default function BookingDetailsModal({ booking, onClose }: Props) {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Booking Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "inline-flex px-2 py-1 rounded-full text-sm font-medium",
                STATUS_STYLES[booking.status] ?? "bg-slate-100 text-slate-700"
              )}
            >
              {booking.status}
            </span>
            <span className="text-sm text-slate-500">#{booking.id.slice(0, 8)}</span>
          </div>
          <div>
            <p className="text-sm text-slate-500">Date & Time</p>
            <p className="font-medium text-slate-900">
              {formatDate(booking.booking_date)} at {formatTime(booking.booking_time)}
            </p>
            <p className="text-sm text-slate-500">
              Duration: {booking.duration_minutes} min
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Customer</p>
            <p className="font-medium text-slate-900">{booking.customers?.name ?? "—"}</p>
            {booking.customers?.phone && (
              <p className="text-sm text-slate-600">{booking.customers.phone}</p>
            )}
            {booking.customers?.email && (
              <p className="text-sm text-slate-600">{booking.customers.email}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-slate-500">Service</p>
            <p className="font-medium text-slate-900">{booking.services?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Staff</p>
            <p className="font-medium text-slate-900">
              {(booking.staff?.users as { name?: string })?.name ?? booking.staff?.role_name ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Amount</p>
            <p className="font-medium text-slate-900">
              {formatCurrency(booking.total_amount)}
            </p>
            {booking.advance_paid !== undefined && booking.advance_paid > 0 && (
              <p className="text-sm text-slate-600">
                Advance paid: {formatCurrency(booking.advance_paid)}
              </p>
            )}
          </div>
          {booking.special_requests && (
            <div>
              <p className="text-sm text-slate-500">Special requests</p>
              <p className="text-slate-700">{booking.special_requests}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
