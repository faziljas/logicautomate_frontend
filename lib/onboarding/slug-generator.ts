// ============================================================
// BookFlow — Slug Generator
// lib/onboarding/slug-generator.ts
// ============================================================

import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────
// generateSlug
// Converts a business name to a URL slug.
// "Salon Bliss"    → "salon-bliss"
// "Dr. Sharma's Clinic" → "dr-sharmas-clinic"
// ─────────────────────────────────────────
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[''`]/g, "")           // remove apostrophes
    .replace(/[^a-z0-9\s-]/g, "")   // remove special chars
    .replace(/\s+/g, "-")            // spaces → hyphens
    .replace(/-+/g, "-")             // collapse multiple hyphens
    .replace(/^-|-$/g, "");          // strip leading/trailing hyphens
}

// ─────────────────────────────────────────
// isSlugAvailable (server-side only)
// Checks the businesses table.
// ─────────────────────────────────────────
export async function isSlugAvailable(
  slug: string,
  excludeBusinessId?: string
): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  let query = supabase
    .from("businesses")
    .select("id")
    .eq("slug", slug);

  if (excludeBusinessId) {
    query = query.neq("id", excludeBusinessId);
  }

  const { data } = await query.maybeSingle();
  return data === null; // null → no row found → available
}

// ─────────────────────────────────────────
// generateUniqueSlug
// Tries base slug first; appends -2, -3 …
// until an available one is found.
// ─────────────────────────────────────────
export async function generateUniqueSlug(
  name: string,
  excludeBusinessId?: string
): Promise<string> {
  const base = generateSlug(name);
  if (!base) throw new Error("Cannot generate slug from empty name");

  // Try base slug
  if (await isSlugAvailable(base, excludeBusinessId)) return base;

  // Try base-2 … base-10
  for (let i = 2; i <= 10; i++) {
    const candidate = `${base}-${i}`;
    if (await isSlugAvailable(candidate, excludeBusinessId)) return candidate;
  }

  // Final fallback: base + random 4-char suffix
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

// ─────────────────────────────────────────
// validateSlugFormat
// Pure function — no DB call.
// ─────────────────────────────────────────
export interface SlugValidation {
  valid:   boolean;
  message: string;
}

export function validateSlugFormat(slug: string): SlugValidation {
  if (!slug) {
    return { valid: false, message: "Slug is required" };
  }
  if (slug.length < 3) {
    return { valid: false, message: "Slug must be at least 3 characters" };
  }
  if (slug.length > 60) {
    return { valid: false, message: "Slug must be 60 characters or fewer" };
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
    return {
      valid: false,
      message:
        "Only lowercase letters, numbers, and hyphens allowed. Cannot start or end with a hyphen.",
    };
  }
  if (/--/.test(slug)) {
    return { valid: false, message: "Consecutive hyphens are not allowed" };
  }

  // Reserved words
  const RESERVED = new Set([
    "admin", "api", "app", "auth", "dashboard", "login", "logout",
    "onboarding", "settings", "staff", "bookflow", "support", "help",
    "pricing", "blog", "about", "terms", "privacy",
  ]);
  if (RESERVED.has(slug)) {
    return { valid: false, message: `"${slug}" is a reserved word` };
  }

  return { valid: true, message: "Looks good!" };
}
