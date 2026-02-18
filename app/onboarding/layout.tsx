// ============================================================
// BookFlow — Onboarding Layout
// app/onboarding/layout.tsx
// ============================================================
// Requires sign-in. Wraps all onboarding pages with OnboardingProvider.
// ============================================================

import { OnboardingProvider } from "@/context/OnboardingContext";
import { OnboardingAuthGuard } from "@/components/onboarding/OnboardingAuthGuard";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingAuthGuard>
      <OnboardingProvider>{children}</OnboardingProvider>
    </OnboardingAuthGuard>
  );
}
