"use client";

// ============================================================
// BookFlow — Services & Pricing
// ============================================================

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import ServiceEditor from "@/components/dashboard/ServiceEditor";

interface Service {
  id: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  price: number;
  advance_amount: number;
  category?: string | null;
  is_active: boolean;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(n);
}

export default function ServicesPage() {
  const { business, role, loading: ctxLoading } = useDashboard();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Service | null>(null);
  const [adding, setAdding] = useState(false);

  const fetchServices = () => {
    if (!business?.id) return;
    setLoading(true);
    fetch(`/api/dashboard/services?businessId=${business.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setServices(data.services ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchServices();
  }, [business?.id]);

  const canEdit = role === "owner";

  const handleSave = async (data: Partial<Service>) => {
    if (!business?.id) return;
    if (editing?.id) {
      const res = await fetch(`/api/services/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchServices();
        setEditing(null);
      } else {
        const d = await res.json();
        throw new Error(d.error);
      }
    } else {
      // Add new service - need POST /api/services route
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id, ...data }),
      });
      if (res.ok) {
        fetchServices();
        setAdding(false);
      } else {
        const d = await res.json();
        throw new Error(d.error ?? "Failed");
      }
    }
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
        <h1 className="text-xl font-bold text-slate-900">Services & Pricing</h1>
        {canEdit && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            <Plus className="w-4 h-4" /> Add Service
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Category</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Duration</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Price</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Advance</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                {canEdit && <th className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.category ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {s.duration_minutes} min
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatCurrency(s.price)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatCurrency(s.advance_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditing(s)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {services.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">
              No services yet. Add your first service.
            </div>
          )}
        </div>
      )}

      {editing && (
        <ServiceEditor
          service={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
      {adding && (
        <ServiceEditor
          service={null}
          onSave={handleSave}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}
