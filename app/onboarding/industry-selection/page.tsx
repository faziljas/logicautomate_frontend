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
    if (process.env.NODE_ENV === "development") {
      console.log(`[handleSelect] Clicked ID: "${id}", Previous: "${state.selectedTemplate}"`);
    }
    setTemplate(id as IndustryType);
  }

  function handleContinue() {
    if (!state.selectedTemplate) return;
    goToStep("business-details");
    router.push("/onboarding/business-details");
  }

  // Debug: Check for duplicate IDs in INDUSTRY_LIST
  useEffect(() => {
    const ids = INDUSTRY_LIST.map((i) => i.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      console.error("🚨 DUPLICATE IDs DETECTED:", duplicates);
    } else {
      console.log("✅ All industry IDs are unique:", ids);
    }
    console.log("Current selectedTemplate:", state.selectedTemplate);
    console.log("Industry IDs:", ids);
  }, [state.selectedTemplate]);

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800">
        <div className="relative max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-violet-400">📅 LogicAutomate</span>
          <div className="flex items-center gap-3">
            <a
              href="/onboarding/industry-selection?reset=1"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-400 px-3 py-1.5 rounded-full hover:bg-slate-800 transition-colors"
              title="Clear previous session and start fresh"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start fresh</span>
            </a>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800 px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              <span>Setup takes ~3 minutes</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-3xl mx-auto px-4 pb-28 pt-6 sm:pt-8">
        <ProgressIndicator currentStep={state.currentStep} className="mb-8" />

        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
            What type of business
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">do you run?</span>
          </h1>
          <p className="mt-3 text-slate-400 text-base">
            We'll pre-configure everything for your industry — services, WhatsApp messages, and more.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {INDUSTRY_LIST.map((industry, index) => {
            const isSelected = state.selectedTemplate === industry.id;
            if (process.env.NODE_ENV === "development" && isSelected) {
              console.log(`[IndustryCard ${index}] ID: "${industry.id}", Selected: ${isSelected}, State: "${state.selectedTemplate}"`);
            }
            return (
              <IndustryCard
                key={industry.id}
                industry={industry}
                selected={isSelected}
                onSelect={handleSelect}
              />
            );
          })}
        </div>

        {state.selectedTemplate && !INDUSTRY_LIST.find((i) => i.id === state.selectedTemplate)?.comingSoon && (
          <div className="mt-6 p-4 rounded-xl bg-slate-800/60 border border-violet-500/30 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <span className="text-2xl">
              {INDUSTRY_LIST.find((i) => i.id === state.selectedTemplate)?.icon}
            </span>
            <div>
              <p className="text-sm font-semibold text-violet-300">
                {INDUSTRY_LIST.find((i) => i.id === state.selectedTemplate)?.name} selected
              </p>
              <p className="text-xs text-slate-400">
                We'll set up default services and templates for you
              </p>
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-sm border-t border-slate-800 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleContinue}
            disabled={!state.selectedTemplate}
            className="w-full flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl py-4 text-base transition-all duration-200"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
          {!state.selectedTemplate && (
            <p className="text-center text-xs text-slate-500 mt-2">
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
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>}>
      <IndustrySelectionContent />
    </Suspense>
  );
}
