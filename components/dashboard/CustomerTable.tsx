"use client";

// ============================================================
// CustomerTable — Searchable customer list
// ============================================================

import React from "react";
import { Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  total_visits: number;
  total_spent: number;
  loyalty_points?: number;
  created_at: string;
}

interface Props {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  search: string;
  onSearchChange: (s: string) => void;
  onPageChange: (p: number) => void;
  onCustomerClick?: (c: Customer) => void;
  loading?: boolean;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CustomerTable({
  customers,
  total,
  page,
  limit,
  search,
  onSearchChange,
  onPageChange,
  onCustomerClick,
  loading,
}: Props) {
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No customers found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Phone</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-600">Email</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-600">Visits</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-600">Total Spent</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className={cn(
                    "border-b border-slate-50 hover:bg-slate-50/50",
                    onCustomerClick && "cursor-pointer"
                  )}
                  onClick={() => onCustomerClick?.(c)}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{c.phone}</td>
                  <td className="px-4 py-2.5 text-slate-600">{c.email ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{c.total_visits}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                    {formatCurrency(c.total_spent)}
                  </td>
                  <td className="px-4 py-2.5">
                    {onCustomerClick && (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100">
          <span className="text-sm text-slate-500">
            {total} customer{total !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page <= 0}
              className="px-2 py-1 text-sm rounded border border-slate-200 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 text-sm rounded border border-slate-200 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
