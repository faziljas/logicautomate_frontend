"use client";

// ============================================================
// PaymentsList
// Dashboard component for owners to view and manage payments.
// - Filter by status: pending / completed / failed / refunded
// - Issue refunds
// - Download receipts
// ============================================================

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  Filter,
} from "lucide-react";

type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  refund_id: string | null;
  refund_amount: number | null;
  refund_status: string | null;
  refund_reason: string | null;
  refunded_at: string | null;
  paid_at: string | null;
  error_message: string | null;
  created_at: string;
  bookings: {
    id: string;
    booking_date: string;
    booking_time: string;
    status: string;
    services: { name: string } | null;
    customers: { name: string; phone: string; email: string | null } | null;
  } | null;
}

interface Props {
  businessId: string;
  onRefundSuccess?: () => void;
}

const STATUS_OPTIONS: { value: "" | PaymentStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

function StatusBadge({ status, refundStatus }: { status: string; refundStatus?: string | null }) {
  const isRefunded = refundStatus === "processed";
  const display = isRefunded ? "Refunded" : status;

  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-slate-100 text-slate-700",
  };
  const style = styles[display.toLowerCase()] ?? "bg-gray-100 text-gray-700";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {display}
    </span>
  );
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

export default function PaymentsList({ businessId, onRefundSuccess }: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"" | PaymentStatus>("");
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundModal, setRefundModal] = useState<Payment | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ businessId });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/payments?${params}`);
      const data = await res.json();
      if (res.ok) setPayments(data.payments ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [businessId, statusFilter]);

  const handleRefund = async (paymentId: string, bookingId: string) => {
    if (!refundReason.trim()) return;
    setRefundingId(bookingId);
    try {
      const res = await fetch("/api/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, reason: refundReason.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setRefundModal(null);
        setRefundReason("");
        await fetchPayments();
        onRefundSuccess?.();
      } else {
        alert(data.error ?? "Refund failed");
      }
    } catch (e) {
      alert("Something went wrong");
    } finally {
      setRefundingId(null);
    }
  };

  const downloadReceipt = (p: Payment) => {
    const booking = p.bookings;
    const customer = booking?.customers;
    const service = booking?.services;
    const lines = [
      "BookFlow Payment Receipt",
      "------------------------",
      `Payment ID: ${p.id}`,
      `Amount: ₹${p.amount}`,
      `Status: ${p.status}`,
      `Date: ${formatDate(p.created_at)}`,
      "",
      "Booking:",
      `Service: ${service?.name ?? "-"}`,
      `Date: ${booking ? formatDate(booking.booking_date) : "-"}`,
      `Time: ${booking ? formatTime(booking.booking_time) : "-"}`,
      "",
      "Customer:",
      `Name: ${customer?.name ?? "-"}`,
      `Phone: ${customer?.phone ?? "-"}`,
      `Email: ${customer?.email ?? "-"}`,
      "",
      `Razorpay Order: ${p.razorpay_order_id ?? "-"}`,
      `Razorpay Payment: ${p.razorpay_payment_id ?? "-"}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${p.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-violet-600" />
          Payments
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "" | PaymentStatus)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchPayments}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">
            No payments found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Customer</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Service</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-600">Amount</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => {
                const booking = p.bookings;
                const customer = booking?.customers;
                const service = booking?.services;
                const canRefund =
                  p.status === "completed" && p.refund_status !== "processed";

                return (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-600">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">{customer?.name ?? "-"}</div>
                      <div className="text-gray-500 text-xs">{customer?.phone ?? ""}</div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{service?.name ?? "-"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={p.status} refundStatus={p.refund_status} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => downloadReceipt(p)}
                          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600"
                          title="Download receipt"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {canRefund && (
                          <button
                            onClick={() => setRefundModal(p)}
                            className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-700"
                            title="Issue refund"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Refund modal */}
      {refundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Issue Refund</h3>
            <p className="text-sm text-gray-600 mb-3">
              Refund ₹{refundModal.amount} for {refundModal.bookings?.customers?.name ?? "this booking"}?
            </p>
            <input
              type="text"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Reason (e.g. Customer cancellation)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setRefundModal(null); setRefundReason(""); }}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRefund(refundModal.id, refundModal.bookings!.id)}
                disabled={!refundReason.trim() || refundingId !== null}
                className="flex-1 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {refundingId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  "Refund"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
