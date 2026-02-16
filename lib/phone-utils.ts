// ============================================================
// Phone validation — international (US, Europe, India, Singapore, etc.)
// lib/phone-utils.ts
// ============================================================

import {
  parsePhoneNumberFromString,
  type CountryCode,
  type E164Number,
} from "libphonenumber-js";

const SUPPORTED_COUNTRIES: CountryCode[] = [
  "US", "IN", "GB", "DE", "FR", "ES", "IT", "NL", "BE", "AT", "CH", "SG",
  "AU", "CA", "AE", "SA", "MY", "JP", "KR",
];

export type PhoneValidationResult = {
  valid:   boolean;
  e164:    string;
  country?: CountryCode;
  error?:  string;
};

/**
 * Validates and normalises a phone number to E.164.
 * Supports US (+1), India (+91), UK (+44), Europe, Singapore (+65), etc.
 *
 * @param phone - Raw input (e.g. "+1 234 567 8900", "+91 98765 43210")
 * @param defaultCountry - Used when number has no country code (e.g. "9876543210" → India)
 */
export function validatePhone(phone: string, defaultCountry?: CountryCode): PhoneValidationResult {
  if (!phone || !phone.trim()) {
    return { valid: false, e164: "", error: "Phone number is required" };
  }

  let cleaned = phone.trim().replace(/\s+/g, "");

  // Strip whatsapp: prefix if present
  if (cleaned.toLowerCase().startsWith("whatsapp:")) {
    cleaned = cleaned.slice(9);
  }

  // If no + prefix, use default country (India for backward compat with 10-digit numbers)
  const defaultC = defaultCountry ?? "IN";
  const parsed = parsePhoneNumberFromString(cleaned, defaultC);

  if (!parsed) {
    return {
      valid: false,
      e164: "",
      error: "Enter a valid phone number with country code (e.g. +1 234 567 8900, +91 98765 43210, +65 9123 4567)",
    };
  }

  if (!parsed.isValid()) {
    return {
      valid: false,
      e164: "",
      error: "Enter a valid phone number for your country",
    };
  }

  const country = parsed.country;
  if (country && !SUPPORTED_COUNTRIES.includes(country)) {
    // Still allow it - E.164 is valid; Twilio supports many countries
    // Just log for debugging; we don't block
  }

  return {
    valid: true,
    e164: parsed.format("E.164") as E164Number,
    country,
  };
}

/**
 * Quick check for onboarding/API validation.
 */
export function isValidPhone(phone: string, defaultCountry?: CountryCode): boolean {
  return validatePhone(phone, defaultCountry).valid;
}
