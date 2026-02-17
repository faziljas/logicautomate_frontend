// ============================================================
// BookFlow — WhatsApp Template Renderer
// lib/whatsapp/template-renderer.ts
// ============================================================
// Pure function engine — no side effects, fully testable.
// ============================================================

import type { TemplateConfig, WhatsAppTemplates } from "@/lib/templates/types";

// ─────────────────────────────────────────
// VARIABLE SET
// All supported {placeholder} keys
// ─────────────────────────────────────────
export interface TemplateVariables {
  // Customer
  customer_name?:     string;
  customer_phone?:    string;
  // Booking
  service_name?:      string;
  staff_name?:        string;
  date?:              string;
  time?:              string;
  duration_mins?:     string | number;
  // Business
  business_name?:     string;
  business_address?:  string;
  business_phone?:    string;
  // Payment
  advance_amount?:    string | number;
  remaining_amount?:  string | number;
  total_amount?:      string | number;
  // Links
  cancellation_link?: string;
  rating_link?:       string;
  google_review_link?: string;
  booking_link?:      string;
  // Loyalty
  visit_count?:       string | number;
  // Promotional
  offer_details?:     string;
  // Extras (pass-through for custom templates)
  [key: string]:      string | number | undefined;
}

// ─────────────────────────────────────────
// RENDER RESULT
// ─────────────────────────────────────────
export interface RenderResult {
  message:         string;
  missingVars:     string[];   // placeholders with no value supplied
  hasUnresolved:   boolean;    // true if any {placeholder} remains
}

export interface ValidationResult {
  valid:           boolean;
  errors:          string[];
  unusedVars:      string[];   // vars supplied but never used
  requiredVars:    string[];   // vars used in template
}

// ─────────────────────────────────────────
// EXTRACT PLACEHOLDERS from a template string
// Returns ["customer_name", "service_name", ...]
// ─────────────────────────────────────────
export function extractPlaceholders(template: string): string[] {
  const matches = template.matchAll(/\{(\w+)\}/g);
  const keys    = new Set<string>();
  for (const m of matches) keys.add(m[1]);
  return [...keys];
}

// ─────────────────────────────────────────
// FORMAT HELPERS
// ─────────────────────────────────────────

/** "2025-02-15" → "Saturday, 15 February 2025" */
export function formatDateLabel(date: string): string {
  try {
    return new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "long",
      day:     "numeric",
      month:   "long",
      year:    "numeric",
    });
  } catch {
    return date;
  }
}

/** "14:30" → "2:30 PM" */
export function formatTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/** Format rupee amount with commas */
export function formatAmount(amount: string | number): string {
  return Number(amount).toLocaleString("en-IN");
}

// ─────────────────────────────────────────
// RENDER TEMPLATE
// ─────────────────────────────────────────

/**
 * Renders a WhatsApp template by replacing {placeholders} with values.
 * Auto-formats dates, times, and currency amounts.
 *
 * @param template   Raw template string with {placeholder} tokens
 * @param variables  Map of variable names to values
 * @returns          RenderResult with the final message and metadata
 */
export function renderTemplate(
  template:  string,
  variables: TemplateVariables
): RenderResult {
  const missingVars: string[] = [];

  // Auto-format date and time variables if raw formats are detected
  const enriched: Record<string, string> = {};
  for (const [key, val] of Object.entries(variables)) {
    if (val === undefined) continue;
    const str = String(val);

    // Auto-format date: "YYYY-MM-DD" → "Saturday, 15 February 2025"
    if (key === "date" && /^\d{4}-\d{2}-\d{2}$/.test(str)) {
      enriched[key] = formatDateLabel(str);
    }
    // Auto-format time: "HH:MM" → "2:30 PM"
    else if (key === "time" && /^\d{2}:\d{2}$/.test(str)) {
      enriched[key] = formatTimeLabel(str);
    }
    // Auto-format currency amounts
    else if (
      ["advance_amount", "remaining_amount", "total_amount"].includes(key) &&
      !isNaN(Number(str))
    ) {
      enriched[key] = formatAmount(str);
    } else {
      enriched[key] = str;
    }
  }

  // Aliases: Settings UI uses these names; renderer uses canonical keys
  const ALIAS_TO_CANONICAL: Record<string, string> = {
    booking_date: "date",
    booking_time: "time",
    duration_minutes: "duration_mins",
    advance_paid: "advance_amount",
    booking_url: "cancellation_link",
  };

  const message = template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const canon = ALIAS_TO_CANONICAL[key] ?? key;
    if (canon in enriched) return enriched[canon];
    if (key in enriched) return enriched[key];
    missingVars.push(key);
    return `{${key}}`; // leave unreplaced rather than empty string
  });

  return {
    message,
    missingVars: [...new Set(missingVars)],
    hasUnresolved: missingVars.length > 0,
  };
}

// ─────────────────────────────────────────
// GET TEMPLATE FROM BUSINESS CONFIG
// ─────────────────────────────────────────

/**
 * Reads the template string for a given message type from the
 * business's custom_config. Falls back gracefully if not found.
 */
export function getTemplateString(
  messageType: keyof WhatsAppTemplates,
  config:      TemplateConfig
): string | null {
  return config?.whatsapp_templates?.[messageType] ?? null;
}

// ─────────────────────────────────────────
// RENDER FROM BUSINESS CONFIG
// Main entry point for the WhatsApp service
// ─────────────────────────────────────────

/**
 * Resolves a message type → template string → renders with variables.
 * Returns null if the message type isn't configured for this business.
 */
export function renderBusinessTemplate(
  messageType: keyof WhatsAppTemplates,
  config:      TemplateConfig,
  variables:   TemplateVariables
): RenderResult | null {
  const templateStr = getTemplateString(messageType, config);
  if (!templateStr) return null;
  return renderTemplate(templateStr, variables);
}

// ─────────────────────────────────────────
// VALIDATE TEMPLATE SYNTAX
// ─────────────────────────────────────────

/**
 * Validates a template string for syntax issues.
 * - Checks for unclosed { brackets
 * - Checks for unknown placeholder names
 * - Reports unused supplied variables
 */
export function validateTemplate(
  template:         string,
  suppliedVars?:    string[]
): ValidationResult {
  const errors:      string[] = [];
  const requiredVars = extractPlaceholders(template);

  // Check for unclosed braces
  const unclosed = template.match(/\{[^}]*$/);
  if (unclosed) {
    errors.push(`Unclosed brace found: "${unclosed[0]}"`);
  }

  // Check for empty placeholder {}
  if (/\{\s*\}/.test(template)) {
    errors.push('Empty placeholder {} found');
  }

  // Check for nested braces
  if (/\{[^}]*\{/.test(template)) {
    errors.push('Nested braces found — templates cannot be nested');
  }

  // Unknown placeholder names (not in our known set)
  // Includes aliases shown in Settings UI: booking_date, booking_time, advance_paid, etc.
  const KNOWN_VARS = new Set<string>([
    "customer_name","customer_phone","service_name","staff_name",
    "date","time","duration_mins","business_name","business_address",
    "business_phone","advance_amount","remaining_amount","total_amount",
    "cancellation_link","rating_link","google_review_link","booking_link",
    "visit_count","offer_details","otp",
    "booking_date","booking_time","duration_minutes","advance_paid",
    "booking_url","loyalty_reward",
  ]);

  for (const v of requiredVars) {
    if (!KNOWN_VARS.has(v)) {
      errors.push(`Unknown placeholder: {${v}} — did you mean a known variable?`);
    }
  }

  // Unused supplied variables
  const unusedVars = suppliedVars
    ? suppliedVars.filter((v) => !requiredVars.includes(v))
    : [];

  return {
    valid:        errors.length === 0,
    errors,
    unusedVars,
    requiredVars,
  };
}

// ─────────────────────────────────────────
// SAMPLE DATA for previewing templates
// ─────────────────────────────────────────
export const SAMPLE_VARIABLES: TemplateVariables = {
  customer_name:     "Meera Shah",
  customer_phone:    "+919845001001",
  service_name:      "Hair Color",
  staff_name:        "Priya Sharma",
  date:              "2025-03-15",
  time:              "15:00",
  duration_mins:     "120",
  business_name:     "Salon Bliss",
  business_address:  "12, 4th Cross, Indiranagar, Bangalore",
  business_phone:    "+918022001100",
  advance_amount:    "500",
  remaining_amount:  "3000",
  total_amount:      "3500",
  cancellation_link: "https://bookflow.app/cancel/booking-123",
  rating_link:       "https://bookflow.app/rate/booking-123",
  google_review_link: "https://g.page/salon-bliss/review",
  booking_link:      "https://bookflow.app/salon-bliss",
  visit_count:       "5",
  offer_details:     "20% OFF on all services this weekend! 🎉",
  loyalty_reward:    "1 FREE haircut on your next visit",
  otp:               "123456",
};
