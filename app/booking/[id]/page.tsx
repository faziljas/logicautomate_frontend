"use client";

// ============================================================
// BookFlow — Customer Booking View / Cancel
// Public page: view details and cancel with phone verification
// ============================================================

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Calendar, Clock, MapPin, Loader2, XCircle } from "lucide-react";

interface BookingDetail {
  id: string;
  booking_date: string;
  booking_time: string;
  duration_minutes: number;
  status: string;
  total_amount: number;
  advance_paid: number;
  special_requests: string | null;
  businesses?: { name: string; slug: string; phone?: string; address?: string; city?: string };
  services?: { name: string; duration_minutes: number; price: number };
  staff?: { role_name: string; users?: { name?: string } };
  customers?: { name: string; phone: string; email?: string };
}

export default function CustomerBookingPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchBooking = useCallback(async () => {
    if (!id || !phone.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ phone: phone.trim() });
      const res = await fetch(`/api/public/bookings/${id}?${q}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load booking");
        setBooking(null);
        return;
      }
      setBooking(data.booking);
    } catch {
      setError("Something went wrong");
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [id, phone]);

  useEffect(() => {
    if (submitted && id && phone.trim()) {
      fetchBooking();
    }
  }, [submitted, id, phone, fetchBooking]);

  const handleCancel = async () => {
    if (!id || !phone.trim() || !booking) return;
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/public/bookings/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), reason: "Cancelled by customer" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to cancel");
        return;
      }
      setBooking((b) => (b ? { ...b, status: "cancelled" } : null));
    } catch {
      setError("Something went wrong");
    } finally {
      setCancelling(false);
    }
  };

  const canCancel =
    booking &&
    booking.status !== "cancelled" &&
    booking.status !== "completed" &&
    booking.status !== "no_show";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {!submitted ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h1 className="text-xl font-bold text-gray-900 mb-2">View your booking</h1>
            <p className="text-gray-600 text-sm mb-6">
              Enter the phone number you used when booking
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!phone.trim()}
                className="w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View booking
              </button>
            </form>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
                <span className="text-gray-600">Loading…</span>
              </div>
            ) : error ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={() => { setSubmitted(false); setError(null); }}
                  className="text-violet-600 font-medium hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : booking ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        booking.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : booking.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-violet-100 text-violet-700"
                      }`}
                    >
                      {booking.status}
                    </span>
                    {booking.businesses && (
                      <Link
                        href={`/${booking.businesses.slug}`}
                        className="text-sm text-violet-600 hover:underline"
                      >
                        Book again
                      </Link>
                    )}
                  </div>

                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">
                      {booking.services?.name ?? "Service"}
                    </h2>
                    {booking.businesses && (
                      <p className="text-gray-600">{booking.businesses.name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-gray-600">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span>{new Date(booking.booking_date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <span>{booking.booking_time} ({booking.duration_minutes} min)</span>
                  </div>
                  {booking.staff?.users?.name && (
                    <p className="text-gray-600">With {booking.staff.users.name}</p>
                  )}
                  {booking.businesses?.address && (
                    <div className="flex items-start gap-3 text-gray-600">
                      <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <span>{[booking.businesses.address, booking.businesses.city].filter(Boolean).join(", ")}</span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500">Total amount</p>
                    <p className="text-lg font-semibold text-gray-900">₹{Number(booking.total_amount).toFixed(2)}</p>
                    {Number(booking.advance_paid) > 0 && (
                      <p className="text-sm text-gray-600">Advance paid: ₹{Number(booking.advance_paid).toFixed(2)}</p>
                    )}
                  </div>

                  {canCancel && (
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-red-200 text-red-700 hover:bg-red-50 font-semibold disabled:opacity-50"
                    >
                      {cancelling ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                      Cancel appointment
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/" className="text-violet-600 hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
