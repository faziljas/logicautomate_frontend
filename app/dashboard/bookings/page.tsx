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
  custom_data?: { customer_name?: string } | null;
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
  const [reminderFeedback, setReminderFeedback] = useState<{
    sent: number;
    failed: number;
  } | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);

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
      (b.custom_data as { customer_name?: string })?.customer_name ?? b.customers?.name ?? "",
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
    if (ids.length === 0) return;
    setSendingReminders(true);
    setReminderFeedback(null);
    let sent = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        const res = await fetch("/api/whatsapp/send-reminder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: id }),
        });
        if (res.ok) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setReminderFeedback({ sent, failed });
    setSendingReminders(false);
    fetchBookings(page, filters);
    setTimeout(() => setReminderFeedback(null), 5000);
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
        <>
          {reminderFeedback && (
            <div
              className={`rounded-lg border px-4 py-2 text-sm ${
                reminderFeedback.failed === 0
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : reminderFeedback.sent === 0
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
              role="alert"
            >
              {reminderFeedback.failed === 0
                ? `Reminders sent successfully (${reminderFeedback.sent})`
                : reminderFeedback.sent === 0
                  ? `Failed to send reminders (${reminderFeedback.failed})`
                  : `Reminders sent: ${reminderFeedback.sent}, failed: ${reminderFeedback.failed}`}
            </div>
          )}
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
            sendingReminders={sendingReminders}
          />
        </>
      )}

      <BookingDetailsModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
