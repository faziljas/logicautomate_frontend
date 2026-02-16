"use client";

// ============================================================
// BookFlow — Public Booking Page Header
// Business logo, name, location, rating, Book Now CTA
// ============================================================

import { MapPin, Phone, Star } from "lucide-react";

export interface HeaderProps {
  businessName: string;
  logoUrl?: string | null;
  industryIcon: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  rating?: number | null;
  totalReviews?: number | null;
  primaryColor: string;
}

export function Header({
  businessName,
  logoUrl,
  industryIcon,
  city,
  address,
  phone,
  rating,
  totalReviews,
  primaryColor,
}: HeaderProps) {
  const locationText = [city, address].filter(Boolean).join(", ");
  const hasRating = rating != null && rating > 0;

  return (
    <header
      className="text-white px-4 py-5 rounded-b-2xl shadow-lg"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="max-w-lg mx-auto">
        <div className="flex items-start gap-4">
          {/* Logo / Icon */}
          <div className="shrink-0 w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={businessName}
                className="object-cover w-full h-full"
                width={56}
                height={56}
              />
            ) : (
              <span className="text-2xl">{industryIcon}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{businessName}</h1>
            {locationText && (
              <div className="flex items-center gap-1.5 mt-1 text-xs opacity-80">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{locationText}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-1.5 mt-0.5 text-xs opacity-80">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <a href={`tel:${phone}`} className="hover:underline">
                  {phone}
                </a>
              </div>
            )}
            {hasRating && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
                {totalReviews != null && totalReviews > 0 && (
                  <span className="text-xs opacity-80">
                    ({totalReviews} reviews)
                  </span>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
