"use client";

// ============================================================
// BookFlow — Today's Overview (Dashboard Home)
// ============================================================

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Calendar,
  Users,
  UserX,
  Loader2,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import StatsCard from "@/components/dashboard/StatsCard";
import TodayAppointments from "@/components/dashboard/TodayAppointments";
import StaffUtilization from "@/components/dashboard/StaffUtilization";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DashboardOverviewPage() {
  const { business, loading: ctxLoading } = useDashboard();
  const router = useRouter();
  const [stats, setStats] = useState<{
    revenue: number;
    revenueChangePercent: number;
    bookingsCount: number;
    newCustomersCount: number;
    noShowsCount: number;
  } | null>(null);
  const [todayBookings, setTodayBookings] = useState<unknown[]>([]);
  const [utilization, setUtilization] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const [statsRes, bookingsRes, utilRes] = await Promise.all([
        fetch(`/api/dashboard/stats?businessId=${business.id}`),
        fetch(`/api/dashboard/today-bookings?businessId=${business.id}`),
        fetch(`/api/dashboard/staff-utilization?businessId=${business.id}`),
      ]);
      const statsData = await statsRes.json();
      const bookingsData = await bookingsRes.json();
      const utilData = await utilRes.json();
      if (statsRes.ok) setStats(statsData.stats);
      if (bookingsRes.ok) setTodayBookings(bookingsData.bookings ?? []);
      if (utilRes.ok) setUtilization(utilData.utilization ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (ctxLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-500">No business found. Complete onboarding first.</p>
        <a
          href="/onboarding"
          className="mt-3 inline-block text-violet-600 font-medium hover:underline"
        >
          Go to onboarding
        </a>
      </div>
    );
  }

  const handleAddWalkIn = () => {
    router.push(`/${business.slug}/book`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Today&apos;s Overview</h1>

      {loading && !stats ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Revenue"
              value={formatCurrency(stats?.revenue ?? 0)}
              icon={DollarSign}
              changePercent={stats?.revenueChangePercent}
              changeLabel="vs yesterday"
            />
            <StatsCard
              title="Bookings"
              value={stats?.bookingsCount ?? 0}
              icon={Calendar}
            />
            <StatsCard
              title="New Customers"
              value={stats?.newCustomersCount ?? 0}
              icon={Users}
            />
            <StatsCard
              title="No-shows"
              value={stats?.noShowsCount ?? 0}
              icon={UserX}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TodayAppointments
                bookings={todayBookings as Parameters<typeof TodayAppointments>[0]["bookings"]}
                businessId={business.id}
                onAction={fetchData}
                onAddWalkIn={handleAddWalkIn}
              />
            </div>
            <div>
              <StaffUtilization
                utilization={utilization as Parameters<typeof StaffUtilization>[0]["utilization"]}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
