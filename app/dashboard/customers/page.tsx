"use client";

// ============================================================
// BookFlow — Customers Database
// ============================================================

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import CustomerTable from "@/components/dashboard/CustomerTable";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  total_visits: number;
  total_spent: number;
  loyalty_points?: number;
  created_at: string;
}

export default function CustomersPage() {
  const { business, loading: ctxLoading } = useDashboard();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const limit = 20;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchCustomers = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    const params = new URLSearchParams({
      businessId: business.id,
      page: String(page),
      limit: String(limit),
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    try {
      const res = await fetch(`/api/dashboard/customers?${params}`);
      const data = await res.json();
      if (res.ok) {
        setCustomers(data.customers ?? []);
        setTotal(data.total ?? 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [business?.id, page, debouncedSearch]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const handleCustomerClick = (c: Customer) => {
    router.push(`/dashboard/customers/${c.id}`);
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
      <h1 className="text-xl font-bold text-slate-900">Customers</h1>
      <CustomerTable
        customers={customers}
        total={total}
        page={page}
        limit={limit}
        search={search}
        onSearchChange={setSearch}
        onPageChange={setPage}
        onCustomerClick={handleCustomerClick}
        loading={loading}
      />
    </div>
  );
}
