"use client";

// ============================================================
// BookFlow — WhatsApp Logs Page (Owner only)
// Shows all WhatsApp messages sent with their status
// ============================================================

import { useState, useEffect } from "react";
import { Loader2, MessageSquare, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

interface WhatsAppLog {
  id: string;
  booking_id: string | null;
  customer_phone: string;
  message_type: string;
  template_used: string | null;
  message_body: string;
  status: "sent" | "delivered" | "failed" | "pending" | "read" | "undelivered";
  provider_id: string | null;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  error_code: string | null;
  error_message: string | null;
  retry_count: number;
  parent_log_id: string | null;
}

export default function WhatsAppLogsPage() {
  const { business, role, loading: ctxLoading } = useDashboard();
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const limit = 50;

  useEffect(() => {
    if (!business?.id || role !== "owner") return;
    fetchLogs();
  }, [business?.id, page, filterType, filterStatus, role]);

  const fetchLogs = async () => {
    if (!business?.id) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        businessId: business.id,
        page: page.toString(),
        limit: limit.toString(),
      });
      if (filterType) params.append("type", filterType);
      if (filterStatus) params.append("status", filterStatus);

      const res = await fetch(`/api/whatsapp/logs?${params}`);
      if (!res.ok) {
        throw new Error("Failed to fetch logs");
      }
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: WhatsAppLog["status"]) => {
    switch (status) {
      case "sent":
      case "delivered":
      case "read":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "failed":
      case "undelivered":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: WhatsAppLog["status"]) => {
    switch (status) {
      case "sent":
      case "delivered":
      case "read":
        return "text-green-700 bg-green-50";
      case "failed":
      case "undelivered":
        return "text-red-700 bg-red-50";
      case "pending":
        return "text-yellow-700 bg-yellow-50";
      default:
        return "text-gray-700 bg-gray-50";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const failedCount = logs.filter((log) => log.status === "failed" || log.status === "undelivered").length;
  const totalPages = Math.ceil(total / limit);

  if (ctxLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (role !== "owner") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p>WhatsApp logs are only available to the business owner.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">WhatsApp Messages</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track all WhatsApp messages sent to customers
          </p>
        </div>
        {failedCount > 0 && (
          <div className="px-4 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-medium">
            {failedCount} failed message{failedCount !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">All Types</option>
          <option value="confirmation">Confirmation</option>
          <option value="reminder_24h">24h Reminder</option>
          <option value="reminder_2h">2h Reminder</option>
          <option value="feedback">Feedback</option>
          <option value="no_show_followup">No Show Followup</option>
          <option value="loyalty_reward">Loyalty Reward</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">All Status</option>
          <option value="failed">Failed Only</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="read">Read</option>
        </select>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
          <p>{error}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-600">No WhatsApp messages found</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Sent At
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Retries
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Error
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {logs.map((log) => {
                    const retryCount = (log.retry_count as number) ?? 0;
                    const isCritical = retryCount >= 3 && (log.status === "failed" || log.status === "undelivered");
                    return (
                      <tr key={log.id} className={isCritical ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-50"}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(log.status)}`}
                            >
                              {log.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {log.message_type.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 font-mono">
                          {log.customer_phone}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-md">
                          <div className="truncate" title={log.message_body}>
                            {log.message_body.substring(0, 100)}
                            {log.message_body.length > 100 && "..."}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDate(log.sent_at)}
                        </td>
                        <td className="px-4 py-3">
                          {retryCount > 0 ? (
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                isCritical
                                  ? "text-red-700 bg-red-100 font-bold"
                                  : "text-amber-700 bg-amber-50"
                              }`}
                            >
                              {retryCount}/3
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {log.error_message ? (
                            <div className="text-red-600" title={log.error_code || undefined}>
                              {log.error_message.substring(0, 50)}
                              {log.error_message.length > 50 && "..."}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} messages
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
