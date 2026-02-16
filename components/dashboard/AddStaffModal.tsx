"use client";

// ============================================================
// AddStaffModal — Add or edit staff (POST /api/staff, PATCH /api/staff)
// ============================================================

import React, { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";

interface StaffToEdit {
  id: string;
  role_name: string;
  users: { name: string; email?: string; phone?: string } | null;
}

interface Props {
  businessId: string;
  onSaved: () => void;
  onClose: () => void;
  staff?: StaffToEdit | null;
}

export default function AddStaffModal({
  businessId,
  onSaved,
  onClose,
  staff: staffToEdit,
}: Props) {
  const isEdit = !!staffToEdit;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleName, setRoleName] = useState("Staff");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (staffToEdit) {
      const u = staffToEdit.users;
      setName(u?.name ?? "");
      setEmail(u?.email ?? "");
      setPhone(u?.phone ?? "");
      setRoleName(staffToEdit.role_name || "Staff");
    }
  }, [staffToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError("Email or phone is required");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const url = "/api/staff";
      const body = isEdit
        ? {
            staffId: staffToEdit.id,
            businessId,
            name: name.trim(),
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            roleName: roleName.trim() || "Staff",
          }
        : {
            businessId,
            name: name.trim(),
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            roleName: roleName.trim() || "Staff",
          };
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isEdit ? "Failed to update staff" : "Failed to add staff"));
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : (isEdit ? "Failed to update staff" : "Failed to add staff"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">{isEdit ? "Edit Staff" : "Add Staff"}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. John Doe"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              At least one of email or phone is required
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Role
            </label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g. Stylist, Doctor, Photographer"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          {!isEdit && (
            <p className="text-xs text-slate-500">
              Default working hours (Mon–Fri 9:00–17:00) will be set so time slots
              are available immediately. You can edit later.
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEdit ? "Saving..." : "Adding..."}
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Add Staff"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
