// ============================================================
// BookFlow — Onboarding Layout
// app/onboarding/layout.tsx
// ============================================================
// Wraps all onboarding pages with the OnboardingProvider
// so every child page shares the same context state.
// ============================================================

import { OnboardingProvider } from "@/context/OnboardingContext";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OnboardingProvider>{children}</OnboardingProvider>;
}
