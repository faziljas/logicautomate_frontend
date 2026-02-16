// ============================================================
// BookFlow — Public Booking Page (SSR)
// URL: bookflow.app/[business_slug]
// Fetches business by slug, loads template config, renders with template styling
// ============================================================

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store"; // Never cache Supabase fetch — 404 when business deleted

import { notFound } from "next/navigation";
import {
  generateBookingPageMeta,
  generateLocalBusinessSchema,
} from "@/lib/booking-page/seo-generator";
import { fetchBusinessBySlug } from "@/lib/booking-page/fetch-business";
import { BookingPageClient } from "./BookingPageClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ business_slug: string }>;
}) {
  const { business_slug } = await params;
  const data = await fetchBusinessBySlug(business_slug);
  if (!data?.business) return { title: "LogicAutomate" };

  return generateBookingPageMeta({
    name: data.business.name,
    slug: data.business.slug,
    city: data.business.city ?? undefined,
    address: data.business.address ?? undefined,
    phone: data.business.phone ?? undefined,
    logo_url: data.business.logo_url ?? undefined,
    services: (data.services ?? []).map((s: { name?: unknown }) => ({
      name: String(s?.name ?? ""),
    })),
    custom_config: (data.business.custom_config ?? {}) as Parameters<typeof generateBookingPageMeta>[0]["custom_config"],
  });
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ business_slug: string }>;
}) {
  const { business_slug } = await params;
  const data = await fetchBusinessBySlug(business_slug);

  if (!data?.business) {
    notFound();
  }

  const schemaJson = generateLocalBusinessSchema({
    name: data.business.name,
    slug: data.business.slug,
    city: data.business.city ?? undefined,
    address: data.business.address ?? undefined,
    phone: data.business.phone ?? undefined,
    logo_url: data.business.logo_url ?? undefined,
    services: (data.services ?? []).map((s: { name?: unknown }) => ({
      name: String(s?.name ?? ""),
    })),
    custom_config: (data.business.custom_config ?? {}) as Parameters<typeof generateLocalBusinessSchema>[0]["custom_config"],
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schemaJson }}
      />
      <BookingPageClient
        initialData={{
          business: data.business,
          services: data.services ?? [],
          staff: data.staff ?? [],
        }}
        slug={business_slug}
      />
    </>
  );
}
