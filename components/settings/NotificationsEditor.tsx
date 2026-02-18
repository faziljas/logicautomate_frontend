"use client";

// ============================================================
// Notifications Editor — Email/SMS preferences in custom_config
// ============================================================

import React, { useState, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { isFreeTier, isInWhatsAppTrial, FREE_TIER } from "@/lib/plan-limits";

export interface NotificationPrefs {
  email_new_booking?: boolean;
  sms_new_booking?: boolean;
  email_reminder_24h?: boolean;
  sms_reminder_24h?: boolean;
  email_reminder_2h?: boolean;
  sms_reminder_2h?: boolean;
  email_feedback?: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  email_new_booking: false,
  sms_new_booking: false,
  email_reminder_24h: false,
  sms_reminder_24h: false,
  email_reminder_2h: false,
  sms_reminder_2h: false,
  email_feedback: false,
};

interface Props {
  businessId: string;
  initialPrefs?: NotificationPrefs | null;
  onSaved?: () => void;
  businessCreatedAt?: string | null;
  subscriptionTier?: string | null;
}

export default function NotificationsEditor({
  businessId,
  initialPrefs,
  onSaved,
  businessCreatedAt,
  subscriptionTier,
}: Props) {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    ...DEFAULT_PREFS,
    ...initialPrefs,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setPrefs({
      ...DEFAULT_PREFS,
      ...initialPrefs,
    });
  }, [initialPrefs]);

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
        body: JSON.stringify({ notifications: prefs }),
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

  const toggle = (key: keyof NotificationPrefs, value: boolean) =>
    setPrefs((p) => ({ ...p, [key]: value }));

  const isFree = isFreeTier(subscriptionTier);
  const inTrial = isInWhatsAppTrial(businessCreatedAt, subscriptionTier);
  const daysRemaining = businessCreatedAt 
    ? Math.max(0, FREE_TIER.whatsappTrialDays - Math.floor((Date.now() - new Date(businessCreatedAt).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isFree && (
        <div className={`rounded-lg border p-4 ${
          inTrial 
            ? "bg-violet-50 border-violet-200 text-violet-800" 
            : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              {inTrial ? (
                <>
                  <p className="font-semibold text-sm mb-1">
                    WhatsApp Trial Active — {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                  </p>
                  <p className="text-xs">
                    You're currently enjoying WhatsApp reminders for free. After {FREE_TIER.whatsappTrialDays} days, upgrade to Pro to continue using WhatsApp reminders.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-sm mb-1">
                    WhatsApp Trial Expired
                  </p>
                  <p className="text-xs mb-2">
                    Your {FREE_TIER.whatsappTrialDays}-day WhatsApp trial has ended. Email reminders will continue to work. Upgrade to Pro for unlimited WhatsApp reminders.
                  </p>
                  <Link 
                    href="/pricing" 
                    className="inline-flex items-center gap-1 text-xs font-medium underline hover:no-underline"
                  >
                    Upgrade to Pro →
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <p className="text-sm text-slate-600">
        Configure email and SMS notifications. WhatsApp reminders are configured
        via WhatsApp Templates and sent automatically when enabled.
      </p>
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

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">New bookings</h3>
        <ToggleRow
          label="Email on new booking"
          checked={!!prefs.email_new_booking}
          onChange={(v) => toggle("email_new_booking", v)}
        />
        <ToggleRow
          label="SMS on new booking"
          checked={!!prefs.sms_new_booking}
          onChange={(v) => toggle("sms_new_booking", v)}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Reminders</h3>
        <ToggleRow
          label="Email 24h reminder"
          checked={!!prefs.email_reminder_24h}
          onChange={(v) => toggle("email_reminder_24h", v)}
        />
        <ToggleRow
          label="SMS 24h reminder"
          checked={!!prefs.sms_reminder_24h}
          onChange={(v) => toggle("sms_reminder_24h", v)}
        />
        <ToggleRow
          label="Email 2h reminder"
          checked={!!prefs.email_reminder_2h}
          onChange={(v) => toggle("email_reminder_2h", v)}
        />
        <ToggleRow
          label="SMS 2h reminder"
          checked={!!prefs.sms_reminder_2h}
          onChange={(v) => toggle("sms_reminder_2h", v)}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Post-service</h3>
        <ToggleRow
          label="Email feedback request"
          checked={!!prefs.email_feedback}
          onChange={(v) => toggle("email_feedback", v)}
        />
      </div>

      <p className="text-xs text-slate-500">
        Note: Email reminders use Resend (set RESEND_API_KEY). WhatsApp uses Meta.
        Once configured, these toggles control delivery. WhatsApp remains the
        primary channel.
      </p>

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

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
      />
    </label>
  );
}
