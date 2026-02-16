"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Phone, Clock } from "lucide-react";
import { useStaff } from "@/context/StaffContext";
import { Timer } from "@/components/staff/Timer";
import { PaymentCollector } from "@/components/staff/PaymentCollector";
import { staffJson } from "@/lib/staff-api";

interface BookingDetail {
  id: string;
  booking_date: string;
  booking_time: string;
  duration_minutes: number;
  end_time?: string;
  status: string;
  total_amount: number;
  advance_paid: number;
  special_requests?: string | null;
  custom_data?: { started_at?: string; staff_private_notes?: string };
  customers: { id: string; name: string; phone?: string; email?: string; notes?: string } | null;
  services: { id: string; name: string; duration_minutes: number; price: number } | null;
}

export default function StaffBookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { isAuthenticated, getToken } = useStaff();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [privateNotes, setPrivateNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !id) {
      if (!isAuthenticated) router.replace("/staff/login");
      return;
    }
    (async () => {
      try {
        const data = await staffJson<{ booking: BookingDetail }>(`/api/staff/bookings/${id}`);
        setBooking(data.booking);
        setPrivateNotes((data.booking.custom_data?.staff_private_notes as string) || "");
      } catch {
        setBooking(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, id, router]);

  const saveNotes = async () => {
    if (!id) return;
    setSavingNotes(true);
    try {
      await staffJson(`/api/staff/bookings/${id}/notes`, {
        method: "PATCH",
        body: JSON.stringify({ privateNotes }),
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleStart = async () => {
    if (!id) return;
    try {
      await staffJson(`/api/staff/bookings/${id}/start`, { method: "POST" });
      const data = await staffJson<{ booking: BookingDetail }>(`/api/staff/bookings/${id}`);
      setBooking(data.booking);
    } catch (_) {}
  };

  const handleCollect = async (amount: number, method: string) => {
    await staffJson("/api/staff/payments/collect", {
      method: "POST",
      body: JSON.stringify({ bookingId: id, amount, paymentMethod: method }),
    });
    const data = await staffJson<{ booking: BookingDetail }>(`/api/staff/bookings/${id}`);
    setBooking(data.booking);
  };

  const handleComplete = async () => {
    if (!id) return;
    try {
      await staffJson(`/api/staff/bookings/${id}/complete`, { method: "POST" });
      const data = await staffJson<{ booking: BookingDetail }>(`/api/staff/bookings/${id}`);
      setBooking(data.booking);
    } catch (_) {}
  };

  const sendFeedbackWhatsApp = () => {
    if (!booking?.customers?.phone) return;
    const msg = encodeURIComponent(
      "Thank you for visiting! We'd love your feedback."
    );
    window.open(`https://wa.me/${booking.customers.phone.replace(/\D/g, "").replace(/^91/, "")}?text=${msg}`, "_blank");
  };

  if (!isAuthenticated) return null;
  if (loading || !booking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <Link href="/staff" className="inline-flex items-center gap-1 text-pink-600">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="mt-4 text-slate-500">Loading…</div>
      </div>
    );
  }

  const customer = booking.customers;
  const service = booking.services;
  const startedAt = (booking.custom_data as { started_at?: string } | undefined)?.started_at;
  const remaining = Number(booking.total_amount) - Number(booking.advance_paid);
  const isCompleted = booking.status === "completed";

  return (
    <div className="mx-auto max-w-lg px-4 pb-8">
      <Link href="/staff" className="inline-flex items-center gap-1 text-pink-600">
        <ArrowLeft className="h-4 w-4" /> Back to schedule
      </Link>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">{service?.name ?? "Service"}</h1>
        <p className="text-slate-600">{customer?.name ?? "Customer"}</p>
        <p className="text-sm text-slate-500">
          {booking.booking_time?.slice(0, 5)} · {booking.duration_minutes} min
        </p>
        {customer?.phone && (
          <a
            href={`tel:${customer.phone}`}
            className="mt-2 flex items-center gap-1 text-pink-600"
          >
            <Phone className="h-4 w-4" /> {customer.phone}
          </a>
        )}
        {booking.special_requests && (
          <div className="mt-3 rounded-lg bg-slate-50 p-2 text-sm text-slate-600">
            <strong>Notes:</strong> {booking.special_requests}
          </div>
        )}
      </div>

      {startedAt && !isCompleted && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Elapsed time</p>
          <Timer startedAt={startedAt} durationMinutes={booking.duration_minutes} />
        </div>
      )}

      {!startedAt && !isCompleted && (
        <button
          type="button"
          onClick={handleStart}
          className="mt-4 w-full rounded-lg bg-pink-500 py-3 font-semibold text-white"
        >
          Start service
        </button>
      )}

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-700">Private notes (for next visit)</label>
        <textarea
          value={privateNotes}
          onChange={(e) => setPrivateNotes(e.target.value)}
          onBlur={saveNotes}
          disabled={savingNotes}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Add notes…"
        />
      </div>

      {!isCompleted && (
        <>
          <div className="mt-4">
            <PaymentCollector
              total={Number(booking.total_amount)}
              advancePaid={Number(booking.advance_paid)}
              remaining={remaining}
              onCollect={handleCollect}
              onFeedbackWhatsApp={remaining <= 0 ? sendFeedbackWhatsApp : undefined}
            />
          </div>
          <button
            type="button"
            onClick={handleComplete}
            className="mt-4 w-full rounded-lg border border-emerald-500 py-3 font-semibold text-emerald-600"
          >
            Mark complete
          </button>
        </>
      )}

      {isCompleted && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-emerald-800">
          Completed. Request feedback via WhatsApp if needed.
          {customer?.phone && (
            <button
              type="button"
              onClick={sendFeedbackWhatsApp}
              className="mt-2 block text-sm underline"
            >
              Send feedback link
            </button>
          )}
        </div>
      )}
    </div>
  );
}
