"use client";

// ============================================================
// BookFlow — Onboarding Context
// context/OnboardingContext.tsx
// ============================================================
// Manages multi-step onboarding state across pages.
// Persists to sessionStorage so a page refresh doesn't
// erase the user's progress.
// ============================================================

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { IndustryType } from "@/lib/templates/types";

// ─────────────────────────────────────────
// STEP ENUM
// ─────────────────────────────────────────
export type OnboardingStep =
  | "industry-selection"
  | "business-details"
  | "auto-config"
  | "customization"
  | "complete";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  "industry-selection",
  "business-details",
  "auto-config",
  "customization",
  "complete",
];

export const STEP_LABELS: Record<OnboardingStep, string> = {
  "industry-selection": "Industry",
  "business-details":   "Details",
  "auto-config":        "Setup",
  "customization":      "Services",
  "complete":           "Complete",
};

// ─────────────────────────────────────────
// BUSINESS DETAILS FORM
// ─────────────────────────────────────────
export interface BusinessDetails {
  name:   string;
  phone:  string;
  email:  string;
  city:   string;
  slug:   string;  // auto-generated, user can override
}

// ─────────────────────────────────────────
// CUSTOM SERVICE (editable version)
// ─────────────────────────────────────────
export interface OnboardingService {
  id:               string;  // temp UUID (client-side)
  name:             string;
  description:      string;
  duration_minutes: number;
  price:            number;
  advance_amount:   number;
  category:         string;
  isNew:            boolean;  // true = added by user, not from template
  isDeleted:        boolean;  // soft-delete
}

// ─────────────────────────────────────────
// FULL ONBOARDING STATE
// ─────────────────────────────────────────
export interface OnboardingState {
  currentStep:      OnboardingStep;
  selectedTemplate: IndustryType | null;
  businessDetails:  BusinessDetails;
  services:         OnboardingService[];
  // Set after /api/onboarding/create-business succeeds
  createdBusinessId:  string | null;
  createdBusinessSlug: string | null;
  bookingUrl:         string | null;
  // UI flags
  isConfiguring:    boolean;
  configProgress:   number;     // 0-100
  configSteps:      string[];   // e.g. ["✅ Created services", "..."]
}

const BLANK_DETAILS: BusinessDetails = {
  name:  "",
  phone: "",
  email: "",
  city:  "",
  slug:  "",
};

const INITIAL_STATE: OnboardingState = {
  currentStep:         "industry-selection",
  selectedTemplate:    null,
  businessDetails:     BLANK_DETAILS,
  services:            [],
  createdBusinessId:   null,
  createdBusinessSlug: null,
  bookingUrl:          null,
  isConfiguring:       false,
  configProgress:      0,
  configSteps:         [],
};

// ─────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────
type Action =
  | { type: "SET_TEMPLATE";       payload: IndustryType }
  | { type: "SET_STEP";           payload: OnboardingStep }
  | { type: "SET_BUSINESS";       payload: Partial<BusinessDetails> }
  | { type: "SET_SLUG";           payload: string }
  | { type: "SET_SERVICES";       payload: OnboardingService[] }
  | { type: "ADD_SERVICE";        payload: OnboardingService }
  | { type: "UPDATE_SERVICE";     payload: { id: string; data: Partial<OnboardingService> } }
  | { type: "DELETE_SERVICE";     payload: string }
  | { type: "SET_CONFIG_START" }
  | { type: "SET_CONFIG_PROGRESS"; payload: { progress: number; step: string } }
  | { type: "SET_CONFIG_DONE";    payload: { businessId: string; slug: string; bookingUrl: string } }
  | { type: "RESET" };

function reducer(state: OnboardingState, action: Action): OnboardingState {
  switch (action.type) {
    case "SET_TEMPLATE":
      return { ...state, selectedTemplate: action.payload };

    case "SET_STEP":
      return { ...state, currentStep: action.payload };

    case "SET_BUSINESS":
      return {
        ...state,
        businessDetails: { ...state.businessDetails, ...action.payload },
      };

    case "SET_SLUG":
      return {
        ...state,
        businessDetails: { ...state.businessDetails, slug: action.payload },
      };

    case "SET_SERVICES":
      return { ...state, services: action.payload };

    case "ADD_SERVICE":
      return { ...state, services: [...state.services, action.payload] };

    case "UPDATE_SERVICE":
      return {
        ...state,
        services: state.services.map((s) =>
          s.id === action.payload.id ? { ...s, ...action.payload.data } : s
        ),
      };

    case "DELETE_SERVICE":
      return {
        ...state,
        services: state.services.map((s) =>
          s.id === action.payload ? { ...s, isDeleted: true } : s
        ),
      };

    case "SET_CONFIG_START":
      return { ...state, isConfiguring: true, configProgress: 0, configSteps: [] };

    case "SET_CONFIG_PROGRESS":
      return {
        ...state,
        configProgress: action.payload.progress,
        configSteps: [...state.configSteps, action.payload.step],
      };

    case "SET_CONFIG_DONE":
      return {
        ...state,
        isConfiguring:       false,
        configProgress:      100,
        createdBusinessId:   action.payload.businessId,
        createdBusinessSlug: action.payload.slug,
        bookingUrl:          action.payload.bookingUrl,
      };

    case "RESET":
      return INITIAL_STATE;

    default:
      return state;
  }
}

// ─────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────
interface OnboardingContextValue {
  state:    OnboardingState;
  dispatch: React.Dispatch<Action>;
  // Convenience helpers
  goToStep:        (step: OnboardingStep) => void;
  goNext:          () => void;
  goBack:          () => void;
  setTemplate:     (id: IndustryType) => void;
  setBusinessField: (field: keyof BusinessDetails, value: string) => void;
  stepIndex:       number;
  totalSteps:      number;
  progressPct:     number;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

const SESSION_KEY = "bookflow_onboarding";

// ─────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, (init) => {
    // Rehydrate from sessionStorage on first render
    if (typeof window === "undefined") return init;
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) return JSON.parse(saved) as OnboardingState;
    } catch {
      // Corrupted storage — start fresh
    }
    return init;
  });

  // Persist state to sessionStorage on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    } catch {
      // Storage full — ignore
    }
  }, [state]);

  const stepIndex  = ONBOARDING_STEPS.indexOf(state.currentStep);
  const totalSteps = ONBOARDING_STEPS.length;
  const progressPct = Math.round(((stepIndex) / (totalSteps - 1)) * 100);

  const goToStep = useCallback((step: OnboardingStep) => {
    dispatch({ type: "SET_STEP", payload: step });
  }, []);

  const goNext = useCallback(() => {
    const next = ONBOARDING_STEPS[stepIndex + 1];
    if (next) dispatch({ type: "SET_STEP", payload: next });
  }, [stepIndex]);

  const goBack = useCallback(() => {
    const prev = ONBOARDING_STEPS[stepIndex - 1];
    if (prev) dispatch({ type: "SET_STEP", payload: prev });
  }, [stepIndex]);

  const setTemplate = useCallback((id: IndustryType) => {
    dispatch({ type: "SET_TEMPLATE", payload: id });
  }, []);

  const setBusinessField = useCallback(
    (field: keyof BusinessDetails, value: string) => {
      dispatch({ type: "SET_BUSINESS", payload: { [field]: value } });
    },
    []
  );

  return (
    <OnboardingContext.Provider
      value={{
        state,
        dispatch,
        goToStep,
        goNext,
        goBack,
        setTemplate,
        setBusinessField,
        stepIndex,
        totalSteps,
        progressPct,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

// ─────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────
export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used inside <OnboardingProvider>");
  }
  return ctx;
}
