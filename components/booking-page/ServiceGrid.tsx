"use client";

// ============================================================
// BookFlow — Service Grid with Category Filter
// Template-aware terminology + pagination for many services
// ============================================================

import { useState, useMemo } from "react";
import { Clock, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ServiceOption {
  id: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  price: number;
  advance_amount: number;
  category?: string | null;
}

interface ServiceGridProps {
  services: ServiceOption[];
  selectedId: string | null;
  onSelect: (service: ServiceOption) => void;
  serviceLabel?: string;
  primaryColor?: string;
  pageSize?: number;
}

export function ServiceGrid({
  services,
  selectedId,
  onSelect,
  serviceLabel = "Service",
  primaryColor = "#7C3AED",
  pageSize = 12,
}: ServiceGridProps) {
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [page, setPage] = useState(0);

  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => set.add(s.category || "Other"));
    return ["all", ...Array.from(set).sort()];
  }, [services]);

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return services;
    return services.filter((s) => (s.category || "Other") === categoryFilter);
  }, [services, categoryFilter]);

  const paginated = useMemo(() => {
    const start = page * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Select a {serviceLabel}
      </h2>

      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategoryFilter(cat);
                setPage(0);
              }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                categoryFilter === cat
                  ? "text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
              style={categoryFilter === cat ? { backgroundColor: primaryColor } : undefined}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {paginated.map((service) => (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className={cn(
              "w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              selectedId === service.id
                ? "border-current bg-opacity-10"
                : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
            )}
            style={
              selectedId === service.id
                ? {
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}15`,
                  }
                : undefined
            }
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-semibold text-sm",
                    selectedId === service.id ? "" : "text-gray-800"
                  )}
                  style={selectedId === service.id ? { color: primaryColor } : undefined}
                >
                  {service.name}
                </p>
                {service.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {service.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {service.duration_minutes} min
                  </span>
                  {service.advance_amount > 0 && (
                    <span
                      className="text-xs font-medium"
                      style={{ color: primaryColor }}
                    >
                      ₹{service.advance_amount} advance
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p
                  className={cn(
                    "font-bold text-sm",
                    selectedId === service.id ? "" : "text-gray-800"
                  )}
                  style={selectedId === service.id ? { color: primaryColor } : undefined}
                >
                  ₹{service.price.toLocaleString()}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
