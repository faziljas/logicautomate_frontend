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
      <div className="relative rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-5 opacity-60 cursor-not-allowed select-none">
        <div className="flex items-start gap-3">
          <span className="text-3xl grayscale">{industry.icon}</span>
          <div>
            <p className="font-semibold text-gray-400 text-sm">{industry.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{industry.description}</p>
          </div>
        </div>
        <span className="absolute top-3 right-3 text-[10px] font-semibold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
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
        selected
          ? "border-violet-600 bg-violet-50 shadow-lg shadow-violet-100"
          : "border-gray-200 bg-white hover:border-violet-300 hover:shadow-md hover:shadow-violet-50"
      )}
    >
      {/* Popular badge */}
      {industry.popular && (
        <span className="absolute top-3 right-3 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
          ⭐ Popular
        </span>
      )}

      {/* Selected checkmark */}
      {selected && (
        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </span>
      )}

      {/* Icon + Name */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className={cn(
            "text-3xl w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-200",
            selected
              ? "bg-white shadow-sm scale-110"
              : "bg-gray-50 group-hover:bg-white group-hover:shadow-sm group-hover:scale-105"
          )}
        >
          {industry.icon}
        </span>
        <div>
          <h3
            className={cn(
              "font-bold text-sm leading-tight",
              selected ? "text-violet-700" : "text-gray-800"
            )}
          >
            {industry.name}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 leading-tight">
            {industry.description}
          </p>
        </div>
      </div>

      {/* Features list — shown on hover or when selected */}
      <ul
        className={cn(
          "space-y-1 overflow-hidden transition-all duration-200",
          selected
            ? "max-h-40 opacity-100"
            : "max-h-0 opacity-0 group-hover:max-h-40 group-hover:opacity-100"
        )}
      >
        {industry.features.map((f) => (
          <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
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
