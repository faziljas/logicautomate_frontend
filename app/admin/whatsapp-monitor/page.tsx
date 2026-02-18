"use client";

// ============================================================
// BookFlow — Super Admin WhatsApp Monitor
// AnyBooking founders can monitor all WhatsApp issues
// ============================================================

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Loader2, AlertTriangle, MessageSquare, TrendingUp, XCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface WhatsAppLog {
  id: string;
  business_id: string;
  booking_id: string | null;
  customer_phone: string;
  message_type: string;
  message_body: string;
  status: string;
  retry_count: number;
  error_message: string | null;
  error_code: string | null;
  sent_at: string;
  businesses: { id: string; name: string; slug: string } | null;
  bookings: { id: string; booking_date: string; booking_time: string; status: string } | null;
}

export default function SuperAdminWhatsAppMonitor() {
  const router = useRouter();
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalFailed: 0, criticalIssues: 0 });
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("failed");
  const [filterMinRetries, setFilterMinRetries] = useState<string>("3");
  const limit = 100;

  useEffect(() => {
    fetchLogs();
  }, [page, filterStatus, filterMinRetries]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: filterStatus,
        minRetries: filterMinRetries,
      });

      const res = await fetch(`/api/admin/whatsapp-logs?${params}`);
      if (!res.ok) {
        if (res.status === 403) {
          setError("Access denied. Super admin access required.");
          return;
        }
        throw new Error("Failed to fetch logs");
      }
      const data = await res.json();
      setLogs(data.logs || []);
      setStats(data.stats || { totalFailed: 0, criticalIssues: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
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

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (error && error.includes("Access denied")) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <p className="text-sm text-red-600">
            This page is only accessible to AnyBooking super admins. Set SUPER_ADMIN_EMAILS in your .env file.
          </p>
        </div>
      </div>
    );
  }

  const criticalLogs = logs.filter((log) => (log.retry_count as number) >= 3);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">WhatsApp System Monitor</h1>
            <p className="text-slate-600 mt-1">AnyBooking — Monitor all WhatsApp issues across all businesses</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Failed Messages</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalFailed}</p>
              </div>
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Critical Issues</p>
                <p className="text-3xl font-bold text-red-700 mt-2">{stats.criticalIssues}</p>
                <p className="text-xs text-red-600 mt-1">Failed after 3+ retries</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Needs Intervention</p>
                <p className="text-3xl font-bold text-amber-700 mt-2">{criticalLogs.length}</p>
                <p className="text-xs text-slate-600 mt-1">On this page</p>
              </div>
              <MessageSquare className="w-12 h-12 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-4">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="failed">Failed Messages</option>
              <option value="">All Status</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
            </select>
            <select
              value={filterMinRetries}
              onChange={(e) => {
                setFilterMinRetries(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="3">Critical (3+ retries)</option>
              <option value="0">All Retry Counts</option>
              <option value="1">1+ retries</option>
              <option value="2">2+ retries</option>
            </select>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
            </button>
          </div>
        </div>

        {/* Logs Table */}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
            <p>{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <p className="text-slate-600">No issues found. All systems operational!</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Business
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Retries
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Error
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {logs.map((log) => {
                    const isCritical = (log.retry_count as number) >= 3;
                    return (
                      <tr
                        key={log.id}
                        className={isCritical ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-50"}
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-slate-900">
                            {log.businesses?.name ?? "Unknown"}
                          </div>
                          <div className="text-xs text-slate-500">{log.businesses?.slug}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 font-mono">
                          {log.customer_phone}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {log.message_type.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              log.status === "failed" || log.status === "undelivered"
                                ? "text-red-700 bg-red-50"
                                : "text-green-700 bg-green-50"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              isCritical ? "text-red-700 bg-red-100 font-bold" : "text-slate-700 bg-slate-100"
                            }`}
                          >
                            {log.retry_count}/3
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {log.error_message ? (
                            <div className="max-w-xs">
                              <div className="text-red-600 font-medium truncate" title={log.error_message}>
                                {log.error_message.substring(0, 60)}
                                {log.error_message.length > 60 && "..."}
                              </div>
                              {log.error_code && (
                                <div className="text-xs text-slate-500 mt-1">{log.error_code}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{formatDate(log.sent_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {logs.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Page {page}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={logs.length < limit}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
