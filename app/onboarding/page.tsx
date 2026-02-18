"use client";

// ============================================================
// BookFlow — Onboarding Root
// Redirects to industry-selection for signed-in users
// ============================================================

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/onboarding/industry-selection");
      } else {
        router.replace("/login");
      }
    });
  }, [supabase.auth, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400">Redirecting…</div>
    </div>
  );
}
