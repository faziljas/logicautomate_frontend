"use client";

// ============================================================
// BookFlow — Industry Selection Card
// components/onboarding/IndustryCard.tsx
// ============================================================
// IMPORTANT: This component is stateless (no local useState).
// It relies 100% on the `selected` prop from parent.
// Parent controls single-select logic - only one industry can be selected.
// ============================================================

import { memo } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface IndustryCardData {
  id:          string;
  name:        string;
  description: string;
  icon:        string;
  primaryColor: string;
  features:    string[];
  popular?:    boolean;
  comingSoon?: boolean;
}

interface IndustryCardProps {
  industry:   IndustryCardData;
  selected:   boolean;
  onSelect:   (id: string) => void;
}

// Stateless component - relies entirely on `selected` prop from parent
// No local state to avoid conflicts with parent's single-select logic
export const IndustryCard = memo(function IndustryCard({ industry, selected, onSelect }: IndustryCardProps) {
  if (industry.comingSoon) {
    return (
      <div className="relative rounded-2xl border-2 border-dashed border-slate-600 bg-slate-800/50 p-5 opacity-60 cursor-not-allowed select-none">
        <div className="flex items-start gap-3">
          <span className="text-3xl grayscale">{industry.icon}</span>
          <div>
            <p className="font-semibold text-slate-500 text-sm">{industry.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{industry.description}</p>
          </div>
        </div>
        <span className="absolute top-3 right-3 text-[10px] font-semibold bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
          Coming Soon
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(industry.id)}
      className={cn(
        "group relative w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
        // Use box-border to ensure border doesn't add to dimensions
        "box-border",
        // Fixed height for all cards to prevent ANY layout shift
        "h-[240px] flex flex-col",
        selected
          ? "border-violet-500 bg-slate-800/80 shadow-lg shadow-violet-500/10"
          : "border-slate-700 bg-slate-800/50 hover:border-violet-500/50 hover:bg-slate-800/80"
      )}
    >
      {/* DEBUG: Visible ID for debugging duplicate selection issues */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute top-1 left-1 text-[10px] font-mono bg-red-900/80 text-red-300 px-1 rounded z-50">
          ID: {industry.id} | Selected: {selected ? "YES" : "NO"}
        </div>
      )}
      {/* Popular badge — left side so it doesn't overlap the selected checkmark */}
      {industry.popular && (
        <span className="absolute top-3 left-3 text-xs font-bold bg-amber-500 text-white px-2.5 py-1 rounded-full shadow-sm">
          Popular
        </span>
      )}

      {/* Selected checkmark — right side */}
      {selected && (
        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </span>
      )}

      {/* Icon + Name */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <span
          className={cn(
            "text-3xl w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-200",
            // Use transform scale without affecting layout
            selected
              ? "bg-slate-700 scale-110"
              : "bg-slate-700/50 group-hover:bg-slate-700 group-hover:scale-105"
          )}
        >
          {industry.icon}
        </span>
        <div>
          <h3
            className={cn(
              "font-bold text-sm leading-tight",
              selected ? "text-violet-300" : "text-white"
            )}
          >
            {industry.name}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 leading-tight">
            {industry.description}
          </p>
        </div>
      </div>

      {/* Features list — shown on hover or when selected */}
      {/* Reserve fixed height space to prevent layout shift - always takes same space */}
      <div className="flex-1 flex flex-col justify-end min-h-[100px]">
        <ul
          className={cn(
            "space-y-1 overflow-hidden transition-all duration-200",
            selected
              ? "max-h-[140px] opacity-100"
              : "max-h-0 opacity-0 group-hover:max-h-[140px] group-hover:opacity-100"
          )}
        >
          {industry.features.map((f) => (
            <li key={f} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </button>
  );
});

// ─────────────────────────────────────────
// INDUSTRY DATA (all available templates)
// ─────────────────────────────────────────
export const INDUSTRY_LIST: IndustryCardData[] = [
  {
    id:           "salon",
    name:         "Salon & Spa",
    description:  "Hair, beauty, nails & wellness",
    icon:         "💇‍♀️",
    primaryColor: "#FF69B4",
    popular:      true,
    features: [
      "Stylist scheduling",
      "Loyalty rewards",
      "Advance payments",
      "WhatsApp reminders",
      "Service packages",
    ],
  },
  {
    id:           "clinic",
    name:         "Healthcare Clinic",
    description:  "Doctors, dentists & specialists",
    icon:         "🏥",
    primaryColor: "#4A90E2",
    popular:      true,
    features: [
      "Patient intake forms",
      "Medical records",
      "Video consultations",
      "Prescription notes",
      "Urgency triage",
    ],
  },
  {
    id:           "coaching",
    name:         "Coaching & Tutoring",
    description:  "Tutors, coaches & mentors",
    icon:         "📚",
    primaryColor: "#34C759",
    features: [
      "Student progress tracking",
      "Group sessions",
      "Homework management",
      "Online & offline modes",
      "Monthly packages",
    ],
  },
  {
    id:           "consulting",
    name:         "Consulting",
    description:  "Business, legal & financial advisors",
    icon:         "💼",
    primaryColor: "#5856D6",
    features: [
      "Client briefing forms",
      "Video call support",
      "Retainer packages",
      "Invoice generation",
      "Secure document sharing",
    ],
  },
  {
    id:           "fitness",
    name:         "Fitness & Gym",
    description:  "Personal trainers & yoga studios",
    icon:         "🏋️",
    primaryColor: "#FF3B30",
    features: [
      "Class scheduling",
      "Membership plans",
      "Progress photos",
      "Group classes",
      "Trainer assignments",
    ],
  },
  {
    id:           "photography",
    name:         "Photography",
    description:  "Photographers & videographers",
    icon:         "📸",
    primaryColor: "#FF9500",
    features: [
      "Shoot scheduling",
      "Location management",
      "Package pricing",
      "Client galleries",
    ],
  },
];
