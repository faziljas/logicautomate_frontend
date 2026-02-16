// ============================================================
// BookFlow — Public Business API (SSR-friendly)
// GET /api/public/businesses/[slug]
// Returns business + services + staff for public booking page
// Cache-Control for 1hr on template config
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: "Slug required" }, { status: 400 });
  }

  const supabase = getAdmin();

  // Fetch business by slug
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

  if (bizErr || !business) {
    return NextResponse.json(
      { error: "Business not found" },
      { status: 404 }
    );
  }

  const businessId = business.id;

  // Fetch services (active only)
  const { data: services, error: svcErr } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price, advance_amount, category")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (svcErr) {
    console.error("[public/businesses] services fetch:", svcErr);
    return NextResponse.json(
      { error: "Failed to load services" },
      { status: 500 }
    );
  }

  // Fetch staff with user name
  const { data: staffRows, error: staffErr } = await supabase
    .from("staff")
    .select("id, role_name, users(name)")
    .eq("business_id", businessId)
    .eq("is_active", true);

  if (staffErr) {
    console.error("[public/businesses] staff fetch:", staffErr);
    return NextResponse.json(
      { error: "Failed to load staff" },
      { status: 500 }
    );
  }

  const staff = (staffRows ?? []).map((s: Record<string, unknown>) => ({
    id: s.id,
    name: (s.users as Record<string, unknown>)?.name ?? "Staff",
    role_name: s.role_name ?? "Staff",
    avatar_url: null,
    rating: null,
    total_reviews: null,
    specializations: [],
  }));

  const response = {
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      address: business.address ?? null,
      city: business.city ?? null,
      phone: business.phone ?? null,
      logo_url: business.logo_url ?? null,
      google_review_link: business.google_review_link ?? null,
      custom_config: business.custom_config ?? {},
    },
    services: (services ?? []).map((s: Record<string, unknown>) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? null,
      duration_minutes: s.duration_minutes ?? 0,
      price: s.price ?? 0,
      advance_amount: s.advance_amount ?? 0,
      category: s.category ?? "Other",
    })),
    staff,
  };

  // Cache for 1 hour (template config rarely changes)
  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
