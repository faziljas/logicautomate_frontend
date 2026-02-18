"use client";

// ============================================================
// BookFlow — Staff Management
// ============================================================

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Loader2, UserPlus, Sparkles } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import StaffCard from "@/components/dashboard/StaffCard";
import AddStaffModal from "@/components/dashboard/AddStaffModal";
import { isFreeTier, FREE_TIER } from "@/lib/plan-limits";

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const fetchStaff = useCallback(() => {
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

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const canEdit = role === "owner";
  const tier = business?.subscription_tier;
  const atStaffLimit = isFreeTier(tier) && staff.length >= FREE_TIER.maxStaff;

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
          <>
            {atStaffLimit ? (
              <Link
                href="/pricing"
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
              >
                <Sparkles className="w-4 h-4" /> Upgrade to Pro for more staff
              </Link>
            ) : (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                <UserPlus className="w-4 h-4" /> Add Staff
              </button>
            )}
          </>
        )}
      </div>
      {atStaffLimit && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          Free plan includes up to {FREE_TIER.maxStaff} staff member. Upgrade to Pro for more.
        </p>
      )}

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
              onEdit={canEdit ? () => setEditingStaff(s) : undefined}
            />
          ))}
        </div>
      )}
      {(showAddModal || editingStaff) && business && (
        <AddStaffModal
          businessId={business.id}
          staff={editingStaff}
          onSaved={() => {
            fetchStaff();
            setEditingStaff(null);
          }}
          onClose={() => {
            setShowAddModal(false);
            setEditingStaff(null);
          }}
        />
      )}
    </div>
  );
}
