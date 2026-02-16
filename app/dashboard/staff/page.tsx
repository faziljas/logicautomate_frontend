"use client";

// ============================================================
// BookFlow — Staff Management
// ============================================================

import { useState, useEffect } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import StaffCard from "@/components/dashboard/StaffCard";

interface StaffMember {
  id: string;
  role_name: string;
  todayBookings?: number;
  rating?: number;
  total_reviews?: number;
  users: { name: string; email?: string; phone?: string } | null;
}

export default function StaffPage() {
  const { business, role, loading: ctxLoading } = useDashboard();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) return;
    setLoading(true);
    fetch(`/api/dashboard/staff?businessId=${business.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setStaff(data.staff ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [business?.id]);

  const canEdit = role === "owner";

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
        <h1 className="text-xl font-bold text-slate-900">Staff</h1>
        {canEdit && (
          <button
            onClick={() => alert("Add staff form - integrate with POST /api/staff")}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            <UserPlus className="w-4 h-4" /> Add Staff
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : staff.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          No staff members yet. Add your first team member to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((s) => (
            <StaffCard
              key={s.id}
              staff={s}
              onEdit={canEdit ? () => alert(`Edit staff ${s.id}`) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
