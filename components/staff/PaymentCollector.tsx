"use client";

import React, { useState } from "react";

const METHODS = [
  { id: "cash", label: "Cash" },
  { id: "upi", label: "UPI" },
  { id: "card", label: "Card" },
] as const;

interface PaymentCollectorProps {
  total: number;
  advancePaid: number;
  remaining: number;
  onCollect: (amount: number, method: string) => Promise<void>;
  onFeedbackWhatsApp?: () => void;
  currency?: string;
}

export function PaymentCollector({
  total,
  advancePaid,
  remaining,
  onCollect,
  onFeedbackWhatsApp,
  currency = "₹",
}: PaymentCollectorProps) {
  const [method, setMethod] = useState<string>("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCollect = async () => {
    if (remaining <= 0) return;
    setError(null);
    setLoading(true);
    try {
      await onCollect(remaining, method);
      onFeedbackWhatsApp?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to collect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700">Payment collection</h3>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Total</span>
          <span className="font-medium">{currency}{total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Advance paid</span>
          <span className="font-medium">{currency}{advancePaid.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-2">
          <span className="font-medium text-slate-700">Remaining</span>
          <span className="font-semibold text-slate-900">{currency}{remaining.toFixed(2)}</span>
        </div>
      </div>

      {remaining > 0 && (
        <>
          <p className="mt-3 text-xs text-slate-500">Payment method</p>
          <div className="mt-1 flex gap-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  method === m.id
                    ? "border-pink-500 bg-pink-50 text-pink-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCollect}
            disabled={loading}
            className="mt-3 w-full rounded-lg bg-pink-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Collecting…" : `Collect ${currency}${remaining.toFixed(2)}`}
          </button>
        </>
      )}

      {remaining <= 0 && (
        <p className="mt-3 text-sm text-emerald-600">Fully paid.</p>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
