"use client";

// ============================================================
// Team Members Editor — List owner + staff with dashboard access
// ============================================================

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, UserPlus, UserCog } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: "owner" | "staff";
  roleName?: string;
}

interface Props {
  businessId: string;
  ownerName?: string;
  ownerEmail?: string;
}

export default function TeamMembersEditor({
  businessId,
  ownerName,
  ownerEmail,
}: Props) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [staffRes] = await Promise.all([
          fetch(`/api/dashboard/staff?businessId=${businessId}`, {
            credentials: "include",
          }),
        ]);
        const staffData = await staffRes.json();
        const staffList = (staffData.staff ?? []) as Array<{
          id: string;
          role_name: string;
          users: { name: string; email?: string; phone?: string } | null;
        }>;

        const list: TeamMember[] = [];

        if (ownerName || ownerEmail) {
          list.push({
            id: "owner",
            name: ownerName ?? "Owner",
            email: ownerEmail,
            role: "owner",
          });
        }

        staffList.forEach((s) => {
          const u = s.users;
          list.push({
            id: s.id,
            name: u?.name ?? "Unknown",
            email: u?.email,
            phone: u?.phone,
            role: "staff",
            roleName: s.role_name,
          });
        });

        setMembers(list);
      } catch {
        setMembers([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [businessId, ownerName, ownerEmail]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-8">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading team...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        People with dashboard access. The owner has full control. Staff can view
        bookings and manage services. Add staff via the Staff page.
      </p>

      <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
        {members.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                <UserCog className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{m.name}</p>
                <p className="text-xs text-slate-500">
                  {m.email || m.phone || "—"} •{" "}
                  {m.role === "owner"
                    ? "Owner"
                    : m.roleName ?? "Staff"}
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                m.role === "owner"
                  ? "bg-violet-100 text-violet-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {m.role === "owner" ? "Owner" : "Staff"}
            </span>
          </div>
        ))}
      </div>

      <Link
        href="/dashboard/staff"
        className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
      >
        <UserPlus className="w-4 h-4" />
        Add staff member
      </Link>
    </div>
  );
}
