"use client";

// ============================================================
// Onboarding — Require sign-in; redirect to /login if not authenticated
// ============================================================

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export function OnboardingAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        const loginUrl = `/login?next=${encodeURIComponent(pathname ?? "/onboarding/industry-selection")}`;
        router.replace(loginUrl);
        return;
      }
      setLoading(false);
    });
  }, [supabase.auth, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}
