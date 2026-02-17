"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, TrendingUp, Calendar } from "lucide-react";
import { useStaff } from "@/context/StaffContext";
import { staffJson } from "@/lib/staff-api";

interface ProfileData {
  staff: { role_name: string; working_hours: Record<string, { start: string; end: string }>; bio?: string };
  stats: {
    today: { servicesCompleted: number; revenue: number };
    week: { servicesCompleted: number; revenue: number };
    month: { servicesCompleted: number; revenue: number };
  };
  rating: number;
  totalReviews: number;
  hasHandledCustomers?: boolean;
}

export default function StaffProfilePage() {
  const router = useRouter();
  const { isAuthenticated, staff, business, logout } = useStaff();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/staff/login");
      return;
    }
    staffJson<ProfileData>("/api/staff/profile")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <Link href="/staff" className="inline-flex items-center gap-1 text-pink-600">
        <ArrowLeft className="h-4 w-4" /> Schedule
      </Link>
      <h1 className="mt-4 text-xl font-bold text-slate-900">Profile</h1>
      {business && <p className="text-sm text-slate-500">{business.name}</p>}

      {loading ? (
        <div className="mt-4 text-slate-500">Loading…</div>
      ) : data ? (
        <>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-xl font-bold text-pink-600">
              {staff?.roleName?.slice(0, 1) ?? "S"}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{data.staff?.role_name ?? "Staff"}</p>
              <div className="flex items-center gap-1 text-sm text-slate-600">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {Number(data.rating || 0).toFixed(1)} ({data.totalReviews ?? 0} reviews)
              </div>
            </div>
          </div>

          {data.hasHandledCustomers && (
            <>
          <h2 className="mt-6 text-sm font-medium text-slate-700">Your stats</h2>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
              <Calendar className="mx-auto h-5 w-5 text-pink-500" />
              <p className="mt-1 text-lg font-semibold">{data.stats.today.servicesCompleted}</p>
              <p className="text-xs text-slate-500">Today</p>
              <p className="text-xs font-medium text-slate-700">₹{data.stats.today.revenue.toFixed(0)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
              <TrendingUp className="mx-auto h-5 w-5 text-pink-500" />
              <p className="mt-1 text-lg font-semibold">{data.stats.week.servicesCompleted}</p>
              <p className="text-xs text-slate-500">This week</p>
              <p className="text-xs font-medium text-slate-700">₹{data.stats.week.revenue.toFixed(0)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
              <TrendingUp className="mx-auto h-5 w-5 text-pink-500" />
              <p className="mt-1 text-lg font-semibold">{data.stats.month.servicesCompleted}</p>
              <p className="text-xs text-slate-500">This month</p>
              <p className="text-xs font-medium text-slate-700">₹{data.stats.month.revenue.toFixed(0)}</p>
            </div>
          </div>
            </>
          )}

          {data.staff?.working_hours && Object.keys(data.staff.working_hours).length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-slate-700">Working hours</h2>
              <ul className="mt-2 space-y-1 rounded-lg bg-slate-50 p-3 text-sm">
                {Object.entries(data.staff.working_hours).map(([day, hrs]) => (
                  <li key={day}>
                    {day}: {hrs?.start ?? "—"} – {hrs?.end ?? "—"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            To update working hours or breaks, ask your manager in the dashboard.
          </p>
        </>
      ) : (
        <p className="mt-4 text-slate-500">Could not load profile.</p>
      )}

      <button
        type="button"
        onClick={() => logout()}
        className="mt-8 w-full rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700"
      >
        Sign out
      </button>
    </div>
  );
}
