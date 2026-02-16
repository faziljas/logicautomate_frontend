// ============================================================
// BookFlow — Server-side business fetch (for SSR)
// Direct DB access, no HTTP round-trip
// Uses getBusinessConfig so UI respects template_id even when
// custom_config is empty or stale (e.g. applyTemplate failed during onboarding)
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { getBusinessConfig } from "@/lib/templates/utils";

export interface FetchedService {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  advance_amount: number;
  category: string | null;
}

export interface FetchedStaff {
  id: string;
  name: string;
  role_name: string;
  avatar_url: null;
  rating: null;
  total_reviews: null;
  specializations: string[];
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function fetchBusinessBySlug(slug: string) {
  const supabase = getAdmin();

  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      slug,
      address,
      city,
      phone,
      logo_url,
      google_review_link,
      custom_config
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (bizErr || !business) return null;

  const businessId = business.id;

  // Use getBusinessConfig so we get template defaults merged in (handles empty
  // or stale custom_config when applyTemplate failed or was never run)
  const mergedConfig = await getBusinessConfig(businessId);

  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price, advance_amount, category")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  const { data: staffRows } = await supabase
    .from("staff")
    .select("id, role_name, users(name)")
    .eq("business_id", businessId)
    .eq("is_active", true);

  const staff: FetchedStaff[] = (staffRows ?? []).map((s: Record<string, unknown>) => ({
    id: String(s.id ?? ""),
    name: String((s.users as Record<string, unknown>)?.name ?? "Staff"),
    role_name: String(s.role_name ?? "Staff"),
    avatar_url: null,
    rating: null,
    total_reviews: null,
    specializations: [],
  }));

  const typedServices: FetchedService[] = (services ?? []).map((s: Record<string, unknown>) => ({
    id: String(s.id ?? ""),
    name: String(s.name ?? ""),
    description: s.description != null ? String(s.description) : null,
    duration_minutes: Number(s.duration_minutes ?? 0),
    price: Number(s.price ?? 0),
    advance_amount: Number(s.advance_amount ?? 0),
    category: s.category != null ? String(s.category) : "Other",
  }));

  return {
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      address: business.address ?? null,
      city: business.city ?? null,
      phone: business.phone ?? null,
      logo_url: business.logo_url ?? null,
      google_review_link: business.google_review_link ?? null,
      custom_config: mergedConfig ?? (business.custom_config ?? {}),
    },
    services: typedServices,
    staff,
  };
}
