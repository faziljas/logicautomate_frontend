"use client";

// ============================================================
// BookFlow — Customer Profile
// ============================================================

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useDashboard } from "@/context/DashboardContext";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  total_visits: number;
  total_spent: number;
  loyalty_points: number;
  notes?: string | null;
  custom_fields?: Record<string, unknown>;
}

interface Visit {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_amount: number;
  services: { name: string } | null;
  staff: { users: { name: string } | null } | null;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(t: string) {
  return new Date(`2000-01-01T${t}`).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { business, loading: ctxLoading } = useDashboard();
  const id = params.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [visitHistory, setVisitHistory] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id || !id) return;
    setLoading(true);
    fetch(`/api/dashboard/customers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCustomer(data.customer);
        setVisitHistory(data.visitHistory ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [business?.id, id]);

  if (ctxLoading || !business) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (loading && !customer) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Customer not found</p>
        <Link href="/dashboard/customers" className="text-violet-600 hover:underline mt-2 inline-block">
          Back to customers
        </Link>
      </div>
    );
  }

  const customFields = customer.custom_fields
    ? Object.entries(customer.custom_fields).filter(([, v]) => v != null && v !== "")
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/customers"
          className="p-2 rounded-lg hover:bg-slate-100"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">{customer.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Contact</h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm text-slate-500">Phone</dt>
                <dd className="font-medium text-slate-900">{customer.phone}</dd>
              </div>
              {customer.email && (
                <div>
                  <dt className="text-sm text-slate-500">Email</dt>
                  <dd className="font-medium text-slate-900">{customer.email}</dd>
                </div>
              )}
            </dl>
          </div>

          {customFields.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Custom Fields</h2>
              <dl className="space-y-2">
                {customFields.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-sm text-slate-500 capitalize">
                      {k.replace(/_/g, " ")}
                    </dt>
                    <dd className="font-medium text-slate-900">
                      {Array.isArray(v) ? v.join(", ") : String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Visit History</h2>
            {visitHistory.length === 0 ? (
              <p className="text-sm text-slate-500">No visits yet</p>
            ) : (
              <div className="space-y-2">
                {visitHistory.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {v.services?.name ?? "—"} • {formatDate(v.booking_date)} {formatTime(v.booking_time)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(v.staff?.users as { name?: string })?.name ?? "—"} • {v.status}
                      </p>
                    </div>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(v.total_amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Summary</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-slate-500">Total Visits</dt>
                <dd className="text-xl font-bold text-slate-900">{customer.total_visits}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">Total Spent</dt>
                <dd className="text-xl font-bold text-violet-600">
                  {formatCurrency(customer.total_spent)}
                </dd>
              </div>
              {customer.loyalty_points > 0 && (
                <div>
                  <dt className="text-sm text-slate-500">Loyalty Points</dt>
                  <dd className="text-lg font-semibold text-slate-900">
                    {customer.loyalty_points}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <button
            onClick={() => router.push(`/dashboard/customers?promo=${customer.id}`)}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-100"
          >
            <MessageSquare className="w-4 h-4" /> Send Promotional Message
          </button>
        </div>
      </div>
    </div>
  );
}
