"use client";

// ============================================================
// BookFlow — Onboarding Progress Indicator
// components/onboarding/ProgressIndicator.tsx
// ============================================================

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ONBOARDING_STEPS,
  STEP_LABELS,
  type OnboardingStep,
} from "@/context/OnboardingContext";

interface ProgressIndicatorProps {
  currentStep: OnboardingStep;
  className?:  string;
}

export function ProgressIndicator({
  currentStep,
  className,
}: ProgressIndicatorProps) {
  const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop: horizontal stepper */}
      <div className="hidden sm:flex items-center justify-center gap-0">
        {ONBOARDING_STEPS.map((step, idx) => {
          const isComplete = idx < currentIndex;
          const isCurrent  = idx === currentIndex;
          const isLast     = idx === ONBOARDING_STEPS.length - 1;

          return (
            <div key={step} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300",
                    isComplete
                      ? "bg-violet-600 border-violet-600 text-white"
                      : isCurrent
                      ? "bg-white border-violet-600 text-violet-600 shadow-md shadow-violet-100"
                      : "bg-white border-gray-200 text-gray-400"
                  )}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "mt-1.5 text-xs font-medium whitespace-nowrap",
                    isCurrent
                      ? "text-violet-600"
                      : isComplete
                      ? "text-violet-500"
                      : "text-gray-400"
                  )}
                >
                  {STEP_LABELS[step]}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 w-16 mx-1 mb-5 transition-all duration-500",
                    idx < currentIndex ? "bg-violet-600" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: progress bar + step label */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-violet-600">
            {STEP_LABELS[currentStep]}
          </span>
          <span className="text-xs text-gray-400">
            Step {currentIndex + 1} of {ONBOARDING_STEPS.length}
          </span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-500"
            style={{
              width: `${Math.round(
                (currentIndex / (ONBOARDING_STEPS.length - 1)) * 100
              )}%`,
            }}
          />
        </div>
        {/* Step dots */}
        <div className="flex justify-between mt-1.5 px-0.5">
          {ONBOARDING_STEPS.map((step, idx) => (
            <div
              key={step}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                idx <= currentIndex ? "bg-violet-600" : "bg-gray-200"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
