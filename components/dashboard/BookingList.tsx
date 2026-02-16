"use client";

// ============================================================
// BookingList — Filterable list view of bookings
// ============================================================

import React, { useState } from "react";
import {
  Filter,
  Download,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  duration_minutes: number;
  status: string;
  total_amount: number;
  customers: { name: string; phone?: string; email?: string } | null;
  services: { name: string; price?: number } | null;
  staff: { users: { name: string } | null; role_name?: string } | null;
}

interface Props {
  bookings: Booking[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onFiltersChange?: (f: Filters) => void;
  onBookingClick?: (b: Booking) => void;
  onExportCSV?: () => void;
  onSendReminders?: (ids: string[]) => void;
}

export interface Filters {
  startDate?: string;
  endDate?: string;
  status?: string;
  staffId?: string;
  serviceId?: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
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

export default function BookingList({
  bookings,
  total,
  page,
  limit,
  onPageChange,
  onFiltersChange,
  onBookingClick,
  onExportCSV,
  onSendReminders,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<Filters>({});

  const totalPages = Math.ceil(total / limit);
  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === bookings.length) setSelected(new Set());
    else setSelected(new Set(bookings.map((b) => b.id)));
  };

  const applyFilters = () => {
    onFiltersChange?.(localFilters);
    setFiltersOpen(false);
  };

  const STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-emerald-100 text-emerald-800",
    completed: "bg-slate-100 text-slate-700",
    cancelled: "bg-red-100 text-red-800",
    no_show: "bg-red-100 text-red-800",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
          {onSendReminders && selected.size > 0 && (
            <button
              onClick={() => onSendReminders(Array.from(selected))}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 py-1.5 text-sm text-white hover:bg-violet-700"
            >
              <Send className="w-4 h-4" /> Send reminders ({selected.size})
            </button>
          )}
        </div>
        <div className="text-sm text-slate-500">
          {total} booking{total !== 1 ? "s" : ""}
        </div>
      </div>

      {filtersOpen && (
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-3">
          <div>
            <label className="text-xs text-slate-500">From</label>
            <input
              type="date"
              value={localFilters.startDate ?? ""}
              onChange={(e) =>
                setLocalFilters((f) => ({ ...f, startDate: e.target.value || undefined }))
              }
              className="block mt-0.5 rounded border border-slate-200 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">To</label>
            <input
              type="date"
              value={localFilters.endDate ?? ""}
              onChange={(e) =>
                setLocalFilters((f) => ({ ...f, endDate: e.target.value || undefined }))
              }
              className="block mt-0.5 rounded border border-slate-200 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Status</label>
            <select
              value={localFilters.status ?? ""}
              onChange={(e) =>
                setLocalFilters((f) => ({ ...f, status: e.target.value || undefined }))
              }
              className="block mt-0.5 rounded border border-slate-200 px-2 py-1 text-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={applyFilters}
            className="self-end rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-700"
          >
            Apply
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-2.5 w-10">
                <input
                  type="checkbox"
                  checked={bookings.length > 0 && selected.size === bookings.length}
                  onChange={toggleAll}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-600">Date</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-600">Time</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-600">Customer</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-600">Service</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-600">Staff</th>
              <th className="text-right px-4 py-2.5 font-medium text-slate-600">Amount</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr
                key={b.id}
                className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer"
                onClick={() => onBookingClick?.(b)}
              >
                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(b.id)}
                    onChange={() => toggleSelect(b.id)}
                    className="rounded border-slate-300"
                  />
                </td>
                <td className="px-4 py-2.5 text-slate-600">{formatDate(b.booking_date)}</td>
                <td className="px-4 py-2.5 text-slate-600">{formatTime(b.booking_time)}</td>
                <td className="px-4 py-2.5 font-medium text-slate-900">{b.customers?.name ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-700">{b.services?.name ?? "—"}</td>
                <td className="px-4 py-2.5 text-slate-600">
                  {(b.staff?.users as { name?: string })?.name ?? b.staff?.role_name ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                  {formatCurrency(b.total_amount)}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                      STATUS_STYLES[b.status] ?? "bg-slate-100 text-slate-700"
                    )}
                  >
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 0}
            className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
