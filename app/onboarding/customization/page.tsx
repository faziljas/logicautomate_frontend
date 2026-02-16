"use client";

// ============================================================
// BookFlow — Step 3: Customization (optional)
// app/onboarding/customization/page.tsx
// ============================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ArrowLeft, Plus, Trash2,
  Edit2, Check, X, Loader2, SkipForward
} from "lucide-react";
import { useOnboarding, type OnboardingService } from "@/context/OnboardingContext";
import { ProgressIndicator } from "@/components/onboarding/ProgressIndicator";
import { getLocalTemplateConfig } from "@/lib/templates/utils";
import { INDUSTRY_LIST } from "@/components/onboarding/IndustryCard";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────
// CONFIG ANIMATION (plays once per session)
// ─────────────────────────────────────────
const CONFIG_STEPS_TEXT = [
  "✅ Created default services",
  "✅ Set up WhatsApp templates",
  "✅ Generated booking page",
  "✅ Configured payment settings",
];

function ConfigAnimation({ onDone }: { onDone: () => void }) {
  const [visibleSteps, setVisibleSteps] = useState<string[]>([]);
  const [progress, setProgress]         = useState(0);

  useEffect(() => {
    CONFIG_STEPS_TEXT.forEach((step, i) => {
      setTimeout(() => {
        setVisibleSteps((prev) => [...prev, step]);
        setProgress(Math.round(((i + 1) / CONFIG_STEPS_TEXT.length) * 100));
        if (i === CONFIG_STEPS_TEXT.length - 1) {
          setTimeout(onDone, 600);
        }
      }, i * 600 + 300);
    });
  }, [onDone]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="text-4xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Setting up your business…
        </h2>
        <p className="text-sm text-gray-500 mb-6">Just a moment!</p>

        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step list */}
        <ul className="space-y-2 text-left">
          {CONFIG_STEPS_TEXT.map((step) => (
            <li
              key={step}
              className={cn(
                "text-sm transition-all duration-300",
                visibleSteps.includes(step)
                  ? "text-gray-700 opacity-100 translate-y-0"
                  : "text-gray-300 opacity-0 translate-y-2"
              )}
            >
              {step}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// INLINE SERVICE EDITOR ROW
// ─────────────────────────────────────────
function ServiceRow({
  service,
  onUpdate,
  onDelete,
}: {
  service:  OnboardingService;
  onUpdate: (data: Partial<OnboardingService>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(service);

  function saveEdit() {
    onUpdate(draft);
    setEditing(false);
  }

  function cancelEdit() {
    setDraft(service);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-violet-200 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-400"
          placeholder="Service name"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Price (₹)</label>
            <input
              type="number"
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-violet-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Duration (mins)</label>
            <input
              type="number"
              value={draft.duration_minutes}
              onChange={(e) =>
                setDraft({ ...draft, duration_minutes: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg border border-violet-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveEdit}
            className="flex items-center gap-1 bg-violet-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Check className="w-3 h-3" /> Save
          </button>
          <button
            onClick={cancelEdit}
            className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 group hover:border-violet-200 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{service.name}</p>
        <p className="text-xs text-gray-500">
          ₹{service.price.toLocaleString()} &nbsp;·&nbsp; {service.duration_minutes} mins
          {service.advance_amount > 0 && (
            <> &nbsp;·&nbsp; ₹{service.advance_amount} advance</>
          )}
        </p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────
export default function CustomizationPage() {
  const router = useRouter();
  const { state, dispatch, goToStep, goBack } = useOnboarding();

  const [showAnimation, setShowAnimation] = useState(state.services.length === 0);
  const [isNavigating, setIsNavigating]   = useState(false);

  const selectedIndustry = INDUSTRY_LIST.find(
    (i) => i.id === state.selectedTemplate
  );

  // Load default services from template on first visit
  useEffect(() => {
    if (state.services.length === 0 && state.selectedTemplate) {
      const tpl = getLocalTemplateConfig(state.selectedTemplate as any);
      if (tpl) {
        const services: OnboardingService[] = tpl.default_services.map((s, idx) => ({
          id:               `svc-${idx}`,
          name:             s.name,
          description:      s.description ?? "",
          duration_minutes: s.duration_minutes,
          price:            s.price,
          advance_amount:   s.advance_amount,
          category:         s.category ?? "",
          isNew:            false,
          isDeleted:        false,
        }));
        dispatch({ type: "SET_SERVICES", payload: services });
      }
    }
  }, [state.selectedTemplate, state.services.length, dispatch]);

  const activeServices = state.services.filter((s) => !s.isDeleted);

  function addService() {
    const newSvc: OnboardingService = {
      id:               `svc-new-${Date.now()}`,
      name:             "New Service",
      description:      "",
      duration_minutes: 60,
      price:            500,
      advance_amount:   0,
      category:         "",
      isNew:            true,
      isDeleted:        false,
    };
    dispatch({ type: "ADD_SERVICE", payload: newSvc });
  }

  async function handleContinue() {
    setIsNavigating(true);
    goToStep("complete");
    router.push("/onboarding/complete");
  }

  function handleSkip() {
    goToStep("complete");
    router.push("/onboarding/complete");
  }

  if (showAnimation) {
    return <ConfigAnimation onDone={() => setShowAnimation(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => { goBack(); router.push("/onboarding/business-details"); }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xl font-bold text-violet-600">📅 LogicAutomate</span>
          <button
            onClick={handleSkip}
            className="ml-auto flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" /> Skip for now
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-28 pt-8">
        <ProgressIndicator currentStep={state.currentStep} className="mb-10" />

        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{selectedIndustry?.icon ?? "🏢"}</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Review your services
          </h1>
        </div>
        <p className="text-gray-500 text-sm mb-7">
          We've pre-loaded the most common services for{" "}
          <span className="font-semibold text-violet-600">
            {selectedIndustry?.name}
          </span>
          . Edit, remove, or add more.
        </p>

        {/* Services list */}
        <div className="space-y-2 mb-4">
          {activeServices.map((service) => (
            <ServiceRow
              key={service.id}
              service={service}
              onUpdate={(data) =>
                dispatch({ type: "UPDATE_SERVICE", payload: { id: service.id, data } })
              }
              onDelete={() =>
                dispatch({ type: "DELETE_SERVICE", payload: service.id })
              }
            />
          ))}
        </div>

        {/* Add service */}
        <button
          onClick={addService}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-violet-200 text-violet-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl py-3 text-sm font-semibold transition-all duration-200"
        >
          <Plus className="w-4 h-4" /> Add Service
        </button>

        {/* Info card */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-xs text-amber-700 leading-relaxed">
            💡 <span className="font-semibold">You can always change this later</span> from
            your dashboard. These services will be shown on your public booking page.
          </p>
        </div>
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleContinue}
            disabled={isNavigating || activeServices.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl py-4 text-base transition-all duration-200 shadow-lg shadow-violet-200 disabled:shadow-none"
          >
            {isNavigating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> One moment…</>
            ) : (
              <>
                Continue ({activeServices.length} service{activeServices.length !== 1 ? "s" : ""})
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
