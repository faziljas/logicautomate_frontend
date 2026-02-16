"use client";

// ============================================================
// BookFlow — Bookings Management
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import BookingCalendar from "@/components/dashboard/BookingCalendar";
import BookingList from "@/components/dashboard/BookingList";
import BookingDetailsModal from "@/components/dashboard/BookingDetailsModal";
import type { Filters } from "@/components/dashboard/BookingList";

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  duration_minutes: number;
  status: string;
  total_amount: number;
  customers: { name: string; phone?: string; email?: string } | null;
  services: { name: string } | null;
  staff: { users: { name: string } | null; role_name?: string } | null;
}

export default function BookingsPage() {
  const { business, loading: ctxLoading } = useDashboard();
  const [view, setView] = useState<"calendar" | "list">("list");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<Filters>({});
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const limit = 20;

  const fetchBookings = useCallback(
    async (p: number, f: Filters) => {
      if (!business?.id) return;
      setLoading(true);
      const params = new URLSearchParams({
        businessId: business.id,
        page: String(p),
        limit: String(limit),
      });
      if (f.startDate) params.set("startDate", f.startDate);
      if (f.endDate) params.set("endDate", f.endDate);
      if (f.status) params.set("status", f.status);
      if (f.staffId) params.set("staffId", f.staffId);
      if (f.serviceId) params.set("serviceId", f.serviceId);
      try {
        const res = await fetch(`/api/dashboard/bookings?${params}`);
        const data = await res.json();
        if (res.ok) {
          setBookings(data.bookings ?? []);
          setTotal(data.total ?? 0);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [business?.id]
  );

  useEffect(() => {
    fetchBookings(page, filters);
  }, [fetchBookings, page, filters]);

  const handleFiltersChange = (f: Filters) => {
    setFilters(f);
    setPage(0);
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Time", "Customer", "Service", "Staff", "Status", "Amount"];
    const rows = bookings.map((b) => [
      b.booking_date,
      b.booking_time,
      b.customers?.name ?? "",
      b.services?.name ?? "",
      (b.staff?.users as { name?: string })?.name ?? "",
      b.status,
      b.total_amount,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendReminders = async (ids: string[]) => {
    for (const id of ids) {
      await fetch("/api/whatsapp/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      });
    }
    fetchBookings(page, filters);
  };

  if (ctxLoading || !business) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Bookings</h1>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 text-sm font-medium ${view === "list" ? "bg-violet-600 text-white" : "bg-white text-slate-600"}`}
          >
            List
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`px-4 py-2 text-sm font-medium ${view === "calendar" ? "bg-violet-600 text-white" : "bg-white text-slate-600"}`}
          >
            Calendar
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        <BookingCalendar
          bookings={bookings}
          onBookingClick={(b) => setSelectedBooking(b as Booking)}
        />
      ) : (
        <BookingList
          bookings={bookings}
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onFiltersChange={handleFiltersChange}
          onBookingClick={setSelectedBooking}
          onExportCSV={handleExportCSV}
          onSendReminders={handleSendReminders}
        />
      )}

      <BookingDetailsModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
