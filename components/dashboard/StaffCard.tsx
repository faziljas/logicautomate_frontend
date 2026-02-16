"use client";

// ============================================================
// StaffCard — Staff member card with metrics
// ============================================================

import React from "react";
import { UserCog, Calendar, Star } from "lucide-react";

interface StaffMember {
  id: string;
  role_name: string;
  todayBookings?: number;
  rating?: number;
  total_reviews?: number;
  is_active?: boolean;
  users: { name: string; email?: string; phone?: string } | null;
}

interface Props {
  staff: StaffMember;
  onEdit?: (staff: StaffMember) => void;
}

export default function StaffCard({ staff, onEdit }: Props) {
  const name = staff.users?.name ?? "Unknown";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
            <UserCog className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{name}</h3>
            <p className="text-sm text-slate-500">{staff.role_name}</p>
            {staff.users?.email && (
              <p className="text-xs text-slate-400 truncate max-w-[200px]">
                {staff.users.email}
              </p>
            )}
          </div>
        </div>
        {onEdit && (
          <button
            onClick={() => onEdit(staff)}
            className="text-sm text-violet-600 hover:underline"
          >
            Edit
          </button>
        )}
      </div>
      <div className="mt-4 flex items-center gap-4 text-sm">
        {staff.todayBookings !== undefined && (
          <div className="flex items-center gap-1.5 text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>{staff.todayBookings} today</span>
          </div>
        )}
        {staff.rating !== undefined && staff.rating > 0 && (
          <div className="flex items-center gap-1.5 text-amber-600">
            <Star className="w-4 h-4 fill-amber-400" />
            <span>{Number(staff.rating).toFixed(1)}</span>
            {staff.total_reviews !== undefined && staff.total_reviews > 0 && (
              <span className="text-slate-400">({staff.total_reviews})</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
