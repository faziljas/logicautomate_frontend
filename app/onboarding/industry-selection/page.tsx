"use client";

// ============================================================
// BookFlow — Step 1: Industry Selection
// app/onboarding/industry-selection/page.tsx
// ============================================================

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Clock, RotateCcw } from "lucide-react";
import { useOnboarding } from "@/context/OnboardingContext";
import { ProgressIndicator } from "@/components/onboarding/ProgressIndicator";
import { IndustryCard, INDUSTRY_LIST } from "@/components/onboarding/IndustryCard";
import type { IndustryType } from "@/lib/templates/types";

const SESSION_KEY = "bookflow_onboarding";

function IndustrySelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, setTemplate, goToStep, dispatch } = useOnboarding();

  // ?reset=1 — clear stale sessionStorage (e.g. after clearing DB to test fresh)
  useEffect(() => {
    if (searchParams.get("reset") === "1") {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // ignore
      }
      dispatch({ type: "RESET" });
      router.replace("/onboarding/industry-selection");
    }
  }, [searchParams, dispatch, router]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Single-select handler: clicking an industry replaces the previous selection
  // (not multi-select - only one industry can be selected at a time)
  function handleSelect(id: string) {
    setTemplate(id as IndustryType);
  }

  function handleContinue() {
    if (!state.selectedTemplate) return;
    goToStep("business-details");
    router.push("/onboarding/business-details");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-violet-600">📅 LogicAutomate</span>
          <div className="flex items-center gap-3">
          <a
            href="/onboarding/industry-selection?reset=1"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-600 px-3 py-1.5 rounded-full hover:bg-violet-50 transition-colors"
            title="Clear previous session and start fresh (use after clearing DB)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start fresh</span>
          </a>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            <span>Setup takes ~3 minutes</span>
          </div>
        </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-28 pt-8">
        {/* Progress */}
        <ProgressIndicator
          currentStep={state.currentStep}
          className="mb-10"
        />

        {/* Headline */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
            What type of business
            <br />
            <span className="text-violet-600">do you run?</span>
          </h1>
          <p className="mt-3 text-gray-500 text-base">
            We'll pre-configure everything for your industry — services,
            WhatsApp messages, and more.
          </p>
        </div>

        {/* Industry grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {INDUSTRY_LIST.map((industry) => (
            <IndustryCard
              key={industry.id}
              industry={industry}
              selected={state.selectedTemplate === industry.id}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Selected preview */}
        {state.selectedTemplate && !INDUSTRY_LIST.find(
          (i) => i.id === state.selectedTemplate
        )?.comingSoon && (
          <div className="mt-6 p-4 rounded-xl bg-violet-50 border border-violet-100 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <span className="text-2xl">
              {INDUSTRY_LIST.find((i) => i.id === state.selectedTemplate)?.icon}
            </span>
            <div>
              <p className="text-sm font-semibold text-violet-700">
                {INDUSTRY_LIST.find((i) => i.id === state.selectedTemplate)?.name} selected
              </p>
              <p className="text-xs text-violet-500">
                We'll set up default services and templates for you
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-100 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleContinue}
            disabled={!state.selectedTemplate}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl py-4 text-base transition-all duration-200 shadow-lg shadow-violet-200 disabled:shadow-none"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
          {!state.selectedTemplate && (
            <p className="text-center text-xs text-gray-400 mt-2">
              Select your industry to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IndustrySelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <IndustrySelectionContent />
    </Suspense>
  );
}
