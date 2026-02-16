// ============================================================
// BookFlow — Dashboard Data Hooks
// Use these for consistent data fetching. Can be migrated to
// React Query (useQuery/useMutation) for caching & optimistic updates.
// ============================================================

import { useState, useEffect, useCallback } from "react";

export function useDashboardStats(businessId: string | undefined) {
  const [stats, setStats] = useState<{
    revenue: number;
    revenueChangePercent: number;
    bookingsCount: number;
    newCustomersCount: number;
    noShowsCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/stats?businessId=${businessId}`);
      const data = await res.json();
      if (res.ok) setStats(data.stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { stats, loading, refetch: fetchData };
}

export function useTodayBookings(businessId: string | undefined) {
  const [bookings, setBookings] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/today-bookings?businessId=${businessId}`);
      const data = await res.json();
      if (res.ok) setBookings(data.bookings ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { bookings, loading, refetch: fetchData };
}
