"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Users, User, LogOut } from "lucide-react";
import { useStaff } from "@/context/StaffContext";
import { AppointmentCard, type AppointmentBooking } from "@/components/staff/AppointmentCard";
import { staffJson } from "@/lib/staff-api";
import { saveScheduleCache, getScheduleCache } from "@/lib/staff-offline";
import { isFcmSupported, getStoredFcmToken, registerForPush } from "@/lib/notifications/fcm-client";

export default function StaffSchedulePage() {
  const router = useRouter();
  const { isAuthenticated, staff, business, getToken, logout } = useStaff();
  const [bookings, setBookings] = useState<AppointmentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const fetchSchedule = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setOffline(false);
    try {
      const res = await fetch("/api/staff/schedule", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.bookings)) {
        setBookings(data.bookings);
        await saveScheduleCache(data.bookings);
      } else if (!navigator.onLine) {
        const cached = await getScheduleCache();
        setBookings(Array.isArray(cached) ? (cached as AppointmentBooking[]) : []);
        setOffline(true);
      }
    } catch {
      if (!navigator.onLine) {
        const cached = await getScheduleCache();
        setBookings(Array.isArray(cached) ? (cached as AppointmentBooking[]) : []);
        setOffline(true);
      }
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/staff/login");
      return;
    }
    fetchSchedule();
  }, [isAuthenticated, router, fetchSchedule]);

  // Request push notification permission on first login (once per device)
  useEffect(() => {
    if (!isAuthenticated || !getToken()) return;
    if (!isFcmSupported() || getStoredFcmToken()) return;
    registerForPush(getToken).catch(() => {});
  }, [isAuthenticated, getToken]);

  const handleStart = async (id: string) => {
    router.push(`/staff/booking/${id}`);
  };

  const handleComplete = async (id: string) => {
    try {
      await staffJson(`/api/staff/bookings/${id}/complete`, { method: "POST" });
      fetchSchedule();
    } catch (_) {}
  };

  if (!isAuthenticated) return null;

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="mx-auto max-w-lg px-4 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Today&apos;s schedule</h1>
          <p className="text-sm text-slate-500">{today}</p>
          {business && <p className="text-xs text-slate-400">{business.name}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-200"
            aria-label="Log out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <nav className="mb-4 flex gap-2">
        <Link
          href="/staff/customers"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white py-2.5 shadow-sm border border-slate-200"
        >
          <Users className="h-5 w-5 text-pink-500" />
          <span className="text-sm font-medium">Customers</span>
        </Link>
        <Link
          href="/staff/profile"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white py-2.5 shadow-sm border border-slate-200"
        >
          <User className="h-5 w-5 text-pink-500" />
          <span className="text-sm font-medium">Profile</span>
        </Link>
      </nav>

      {loading ? (
        <div className="py-8 text-center text-slate-500">Loading schedule…</div>
      ) : (
        <div className="space-y-3">
          {offline && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Showing cached data. Connect to sync.
            </p>
          )}
          {bookings.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              No appointments today.
            </div>
          ) : (
            bookings.map((b) => (
              <AppointmentCard
                key={b.id}
                booking={b}
                onStart={handleStart}
                onComplete={handleComplete}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
