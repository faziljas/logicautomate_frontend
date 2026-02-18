"use client";

// ============================================================
// BookFlow — Dashboard Context
// Provides business, session, user role, and terminology.
// ============================================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { TemplateTerminology } from "@/lib/templates/types";

export type DashboardRole = "owner" | "staff" | "manager";

interface Business {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  template_id?: string | null;
  custom_config?: { terminology?: TemplateTerminology };
  subscription_tier?: string | null;
  created_at?: string | null;
}

interface User {
  id: string;
  email?: string;
  name?: string;
  role?: string;
}

interface DashboardState {
  session: { user: User } | null;
  business: Business | null;
  role: DashboardRole;
  terminology: TemplateTerminology;
  loading: boolean;
  staffId: string | null; // If user is staff, their staff record id
}

const DEFAULT_TERMINOLOGY: TemplateTerminology = {
  service_provider: "Staff",
  service_providers: "Staff",
  service: "Service",
  services: "Services",
  customer: "Customer",
  customers: "Customers",
  booking: "Appointment",
  bookings: "Appointments",
};

const DashboardContext = createContext<DashboardState & { refetch: () => Promise<void>; signOut: () => Promise<void> } | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [state, setState] = useState<DashboardState>({
    session: null,
    business: null,
    role: "owner",
    terminology: DEFAULT_TERMINOLOGY,
    loading: true,
    staffId: null,
  });

  const load = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s) {
      setState((prev) => ({ ...prev, session: null, business: null, loading: false }));
      router.replace("/login");
      return;
    }

    const userId = (s.user as User).id;

    // Fetch business owned by this user
    const { data: biz } = await supabase
      .from("businesses")
      .select("id, name, slug, owner_id, template_id, custom_config, subscription_tier, created_at")
      .eq("owner_id", userId)
      .limit(1)
      .single();

    if (biz) {
      const cfg = (biz.custom_config as { terminology?: TemplateTerminology }) ?? {};
      const term = cfg.terminology ?? DEFAULT_TERMINOLOGY;
      setState({
        session: s as { user: User },
        business: biz as Business,
        role: "owner",
        terminology: term,
        loading: false,
        staffId: null,
      });
      return;
    }

    // Check if user is staff (linked via users -> staff)
    const { data: staffRow } = await supabase
      .from("staff")
      .select("id, business_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (staffRow) {
      const { data: biz2 } = await supabase
        .from("businesses")
        .select("id, name, slug, owner_id, template_id, custom_config, subscription_tier, created_at")
        .eq("id", staffRow.business_id)
        .single();

      if (biz2) {
        const cfg = (biz2.custom_config as { terminology?: TemplateTerminology }) ?? {};
        const term = cfg.terminology ?? DEFAULT_TERMINOLOGY;
        setState({
          session: s as { user: User },
          business: biz2 as Business,
          role: "staff",
          terminology: term,
          loading: false,
          staffId: staffRow.id,
        });
        return;
      }
    }

    setState({
      session: s as { user: User },
      business: null,
      role: "owner",
      terminology: DEFAULT_TERMINOLOGY,
      loading: false,
      staffId: null,
    });
  }, [supabase, router]);

  useEffect(() => {
    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      if (!s) {
        setState((prev) => ({ ...prev, session: null, business: null }));
        router.replace("/login");
      } else {
        load();
      }
    });
    return () => subscription.unsubscribe();
  }, [load, supabase.auth, router]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  }, [supabase.auth, router]);

  const value = {
    ...state,
    refetch: load,
    signOut,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
