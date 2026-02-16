"use client";

// ============================================================
// Booking Rules Editor — Edit booking_rules in custom_config
// ============================================================

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { BookingRules } from "@/lib/templates/types";

const DEFAULT_RULES: BookingRules = {
  advance_booking_days: 30,
  min_advance_notice_hours: 2,
  cancellation_window_hours: 4,
  advance_payment_required: true,
  advance_payment_percentage: 30,
};

interface Props {
  businessId: string;
  initialRules?: Partial<BookingRules> | null;
  onSaved?: () => void;
}

export default function BookingRulesEditor({
  businessId,
  initialRules,
  onSaved,
}: Props) {
  const [rules, setRules] = useState<BookingRules>({
    ...DEFAULT_RULES,
    ...initialRules,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setRules({
      ...DEFAULT_RULES,
      ...initialRules,
    });
  }, [initialRules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/custom-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ booking_rules: rules }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setSuccess(true);
      onSaved?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">
          Saved successfully.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Advance booking window (days)
        </label>
        <input
          type="number"
          min={1}
          max={365}
          value={rules.advance_booking_days}
          onChange={(e) =>
            setRules((r) => ({
              ...r,
              advance_booking_days: Math.max(1, parseInt(e.target.value, 10) || 1),
            }))
          }
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
        <p className="text-xs text-slate-500 mt-1">
          How far ahead customers can book (e.g. 30 = up to 30 days)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Minimum advance notice (hours)
        </label>
        <input
          type="number"
          min={0}
          value={rules.min_advance_notice_hours}
          onChange={(e) =>
            setRules((r) => ({
              ...r,
              min_advance_notice_hours: Math.max(
                0,
                parseInt(e.target.value, 10) || 0
              ),
            }))
          }
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
        <p className="text-xs text-slate-500 mt-1">
          Minimum hours before an appointment slot can be booked
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Cancellation window (hours)
        </label>
        <input
          type="number"
          min={0}
          value={rules.cancellation_window_hours}
          onChange={(e) =>
            setRules((r) => ({
              ...r,
              cancellation_window_hours: Math.max(
                0,
                parseInt(e.target.value, 10) || 0
              ),
            }))
          }
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
        <p className="text-xs text-slate-500 mt-1">
          Inside this window before the appointment, cancellation may be blocked
        </p>
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={rules.advance_payment_required}
            onChange={(e) =>
              setRules((r) => ({
                ...r,
                advance_payment_required: e.target.checked,
              }))
            }
            className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
          />
          <span className="text-sm font-medium text-slate-700">
            Require advance payment
          </span>
        </label>
      </div>

      {rules.advance_payment_required && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Advance payment percentage (0–100)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={rules.advance_payment_percentage}
            onChange={(e) =>
              setRules((r) => ({
                ...r,
                advance_payment_percentage: Math.min(
                  100,
                  Math.max(0, parseInt(e.target.value, 10) || 0)
                ),
              }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60 flex items-center gap-2"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Changes"
        )}
      </button>
    </form>
  );
}
