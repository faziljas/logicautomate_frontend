"use client";

import React, { useState, useCallback } from "react";
import { Search, User, Phone } from "lucide-react";
import { staffJson } from "@/lib/staff-api";

export interface CustomerResult {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  total_visits: number;
  total_spent: number;
  notes?: string | null;
  custom_fields?: Record<string, unknown>;
}

interface CustomerSearchProps {
  onSelect?: (customer: CustomerResult) => void;
  placeholder?: string;
  minChars?: number;
}

export function CustomerSearch({
  onSelect,
  placeholder = "Search by name or phone…",
  minChars = 2,
}: CustomerSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < minChars) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await staffJson<{ customers: CustomerResult[] }>(
        `/api/staff/customers?q=${encodeURIComponent(q)}`
      );
      setResults(data.customers ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [minChars]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    search(v);
  };

  return (
    <div className="w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-slate-800 placeholder-slate-400"
          autoComplete="off"
        />
      </div>
      {loading && (
        <p className="mt-2 text-sm text-slate-500">Searching…</p>
      )}
      <ul className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white">
        {results.length === 0 && query.length >= minChars && !loading && (
          <li className="px-4 py-3 text-sm text-slate-500">No customers found</li>
        )}
        {results.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => {
                onSelect?.(c);
                setQuery("");
                setResults([]);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-pink-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-100 text-pink-600">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800">{c.name}</p>
                {c.phone && (
                  <p className="flex items-center gap-1 text-sm text-slate-500">
                    <Phone className="h-3 w-3" />
                    {c.phone}
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  {c.total_visits} visits · ₹{Number(c.total_spent).toFixed(0)} spent
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
