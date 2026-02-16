"use client";

// ============================================================
// BookFlow — Staff Selector (after service selection)
// Photo, name, role, rating, specializations + "Any Available"
// ============================================================

import { Star, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StaffOption {
  id: string;
  name: string;
  role_name: string;
  rating?: number | null;
  total_reviews?: number | null;
  avatar_url?: string | null;
  specializations?: string[];
}

interface StaffSelectorProps {
  staff: StaffOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  providerLabel?: string;
  primaryColor?: string;
  allowAny?: boolean;
}

export function StaffSelector({
  staff,
  selectedId,
  onSelect,
  providerLabel = "Staff",
  primaryColor = "#7C3AED",
  allowAny = true,
}: StaffSelectorProps) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Choose your {providerLabel}
      </h2>
      <div className="space-y-2">
        {allowAny && (
          <button
            onClick={() => onSelect("any")}
            className={cn(
              "w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all duration-150 focus:outline-none",
              selectedId === "any"
                ? "border-current"
                : "border-gray-100 bg-white hover:border-gray-200"
            )}
            style={
              selectedId === "any"
                ? {
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}12`,
                  }
                : undefined
            }
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${primaryColor}25` }}
              >
                <Users className="w-5 h-5" style={{ color: primaryColor }} />
              </div>
              <div>
                <p
                  className={cn(
                    "font-semibold text-sm",
                    selectedId === "any" ? "" : "text-gray-800"
                  )}
                  style={selectedId === "any" ? { color: primaryColor } : undefined}
                >
                  Any Available {providerLabel}
                </p>
                <p className="text-xs text-gray-400">
                  We'll assign the first available
                </p>
              </div>
            </div>
          </button>
        )}

        {staff.map((member) => (
          <button
            key={member.id}
            onClick={() => onSelect(member.id)}
            className={cn(
              "w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all duration-150 focus:outline-none",
              selectedId === member.id
                ? "border-current"
                : "border-gray-100 bg-white hover:border-gray-200"
            )}
            style={
              selectedId === member.id
                ? {
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}12`,
                  }
                : undefined
            }
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-gray-600">
                {member.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatar_url}
                    alt={member.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    width={40}
                    height={40}
                  />
                ) : (
                  member.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-semibold text-sm",
                    selectedId === member.id ? "" : "text-gray-800"
                  )}
                  style={
                    selectedId === member.id ? { color: primaryColor } : undefined
                  }
                >
                  {member.name}
                </p>
                <p className="text-xs text-gray-400">{member.role_name}</p>
                {member.specializations && member.specializations.length > 0 && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {member.specializations.slice(0, 3).join(" · ")}
                  </p>
                )}
              </div>
              {member.rating != null && member.rating > 0 && (
                <div className="flex items-center gap-1 shrink-0">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-semibold text-gray-600">
                    {member.rating.toFixed(1)}
                  </span>
                  {member.total_reviews != null && (
                    <span className="text-xs text-gray-400">
                      ({member.total_reviews})
                    </span>
                  )}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
