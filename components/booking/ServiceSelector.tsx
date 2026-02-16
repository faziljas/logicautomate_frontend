"use client";
import { Clock, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ServiceOption {
  id:               string;
  name:             string;
  description?:     string;
  duration_minutes: number;
  price:            number;
  advance_amount:   number;
  category?:        string;
}

interface ServiceSelectorProps {
  services:        ServiceOption[];
  selectedId:      string | null;
  onSelect:        (service: ServiceOption) => void;
  serviceLabel?:   string; // "Service" | "Consultation" | "Session"
}

export function ServiceSelector({
  services,
  selectedId,
  onSelect,
  serviceLabel = "Service",
}: ServiceSelectorProps) {
  const grouped = services.reduce<Record<string, ServiceOption[]>>((acc, s) => {
    const cat = s.category ?? "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Select a {serviceLabel}
      </h2>
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="mb-5">
          {Object.keys(grouped).length > 1 && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {category}
            </p>
          )}
          <div className="space-y-2">
            {items.map((service) => (
              <button
                key={service.id}
                onClick={() => onSelect(service)}
                className={cn(
                  "w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                  selectedId === service.id
                    ? "border-violet-600 bg-violet-50"
                    : "border-gray-100 bg-white hover:border-violet-200 hover:shadow-sm"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-semibold text-sm",
                      selectedId === service.id ? "text-violet-700" : "text-gray-800"
                    )}>
                      {service.name}
                    </p>
                    {service.description && (
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                        {service.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {service.duration_minutes} mins
                      </span>
                      {service.advance_amount > 0 && (
                        <span className="text-xs text-violet-500 font-medium">
                          ₹{service.advance_amount} advance
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn(
                      "font-bold text-sm",
                      selectedId === service.id ? "text-violet-700" : "text-gray-800"
                    )}>
                      ₹{service.price.toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
