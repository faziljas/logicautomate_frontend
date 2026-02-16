// ============================================================
// BookFlow — SEO & Schema.org for Public Booking Page
// lib/booking-page/seo-generator.ts
// ============================================================

import type { Metadata } from "next";
import type { TemplateConfig } from "@/lib/templates/types";

export interface BusinessSEOData {
  name: string;
  slug: string;
  city?: string;
  address?: string;
  phone?: string;
  logo_url?: string;
  services: { name: string }[];
  custom_config: TemplateConfig;
}

/**
 * Generate dynamic meta tags for the booking page
 */
export function generateBookingPageMeta(data: BusinessSEOData): Metadata {
  const { name, city, services, custom_config } = data;
  const terminology = custom_config?.terminology;
  const serviceType = terminology?.service ?? "appointment";
  const servicesList = services
    .slice(0, 5)
    .map((s) => s.name)
    .join(", ");
  const cityPart = city ? ` in ${city}` : "";

  const title = `${name} - Book ${serviceType} Online`;
  const description = `Book ${terminology?.bookings?.toLowerCase() ?? "appointments"} at ${name}${cityPart}. ${servicesList}${servicesList ? "." : ""}`;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bookflow.app";
  const pageUrl = `${siteUrl}/${data.slug}`;
  const ogImage = data.logo_url ?? `${siteUrl}/og-default.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "BookFlow",
      images: [{ url: ogImage, width: 1200, height: 630, alt: name }],
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: pageUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
  };
}

/**
 * Generate Schema.org LocalBusiness JSON-LD
 */
export function generateLocalBusinessSchema(data: BusinessSEOData): string {
  const { name, address, city, phone, slug, logo_url } = data;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bookflow.app";

  const addressObj =
    address || city
      ? {
          "@type": "PostalAddress" as const,
          ...(address && { streetAddress: address }),
          ...(city && { addressLocality: city }),
        }
      : undefined;

  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    url: `${siteUrl}/${slug}`,
    ...(logo_url && { image: logo_url }),
    ...(addressObj && { address: addressObj }),
    ...(phone && { telephone: phone }),
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/${slug}`,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
      result: {
        "@type": "Reservation",
        name: `Book at ${name}`,
      },
    },
  };

  return JSON.stringify(schema);
}
