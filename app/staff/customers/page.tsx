"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useStaff } from "@/context/StaffContext";
import { CustomerSearch, type CustomerResult } from "@/components/staff/CustomerSearch";
import { staffJson } from "@/lib/staff-api";

interface PastBooking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_amount: number;
  services: { name: string; duration_minutes: number } | null;
  staff: { users: { name: string } | null } | null;
}

export default function StaffCustomersPage() {
  const router = useRouter();
  const { isAuthenticated } = useStaff();
  const [selected, setSelected] = useState<CustomerResult | null>(null);
  const [pastBookings, setPastBookings] = useState<PastBooking[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/staff/login");
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!selected?.id) {
      setPastBookings([]);
      return;
    }
    setLoading(true);
    staffJson<{ bookings: PastBooking[] }>(`/api/staff/customers/${selected.id}/bookings`)
      .then((data) => setPastBookings(data.bookings ?? []))
      .catch(() => setPastBookings([]))
      .finally(() => setLoading(false));
  }, [selected?.id]);

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <Link
        href="/staff"
        className="inline-flex items-center gap-1 text-pink-600"
      >
        <ArrowLeft className="h-4 w-4" /> Schedule
      </Link>
      <h1 className="mt-4 text-xl font-bold text-slate-900">Customer history</h1>
      <p className="text-sm text-slate-500">Search by name or phone</p>

      <div className="mt-4">
        <CustomerSearch onSelect={setSelected} />
      </div>

      {selected && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">{selected.name}</h2>
          {selected.phone && <p className="text-sm text-slate-500">{selected.phone}</p>}
          <p className="text-xs text-slate-400">
            {selected.total_visits} visits · ₹{Number(selected.total_spent).toFixed(0)} spent
          </p>
          {selected.notes && (
            <p className="mt-2 text-sm text-slate-600">{selected.notes}</p>
          )}

          <h3 className="mt-4 text-sm font-medium text-slate-700">Past visits</h3>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : pastBookings.length === 0 ? (
            <p className="text-sm text-slate-500">No past visits</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {pastBookings.map((b) => (
                <li
                  key={b.id}
                  className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span>
                    {b.booking_date} {b.booking_time?.slice(0, 5)} · {b.services?.name ?? "—"}
                  </span>
                  <span className="text-slate-500">{b.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
