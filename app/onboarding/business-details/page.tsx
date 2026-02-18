"use client";

// ============================================================
// BookFlow — Step 2: Business Details
// app/onboarding/business-details/page.tsx
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Building2, Phone,
  Mail, MapPin, Link2, CheckCircle2, XCircle, Loader2
} from "lucide-react";
import { useOnboarding } from "@/context/OnboardingContext";
import { ProgressIndicator } from "@/components/onboarding/ProgressIndicator";
import { generateSlug } from "@/lib/onboarding/slug-generator";
import { INDUSTRY_LIST } from "@/components/onboarding/IndustryCard";
import { validatePhone } from "@/lib/phone-utils";

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function useSlugCheck(slug: string) {
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!slug || slug.length < 3) {
      setStatus("idle");
      return;
    }
    setStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/onboarding?action=check-slug&slug=${encodeURIComponent(slug)}`
        );
        const data = await res.json();
        setStatus(data.available ? "available" : "taken");
        setMessage(data.message);
      } catch {
        setStatus("idle");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [slug]);

  return { status, message };
}

// ─────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────
export default function BusinessDetailsPage() {
  const router = useRouter();
  const { state, dispatch, goBack, goToStep } = useOnboarding();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  const { businessDetails: bd } = state;
  const slugCheck = useSlugCheck(bd.slug);

  // Auto-generate slug from business name (sync when name changes, unless user customized slug)
  useEffect(() => {
    const generated = generateSlug(bd.name);
    if (bd.name.trim().length >= 3 && generated.length >= 3 && (!slugEdited || !bd.slug)) {
      dispatch({ type: "SET_SLUG", payload: generated });
    }
  }, [bd.name, bd.slug, slugEdited, dispatch]);

  const selectedIndustry = INDUSTRY_LIST.find(
    (i) => i.id === state.selectedTemplate
  );

  function setField(field: string, value: string) {
    dispatch({ type: "SET_BUSINESS", payload: { [field]: value } });
    // Clear error on change
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!bd.name.trim() || bd.name.trim().length < 3)
      e.name = "Business name must be at least 3 characters";
    if (bd.name.trim().length > 50)
      e.name = "Business name must be 50 characters or fewer";
    const phoneRes = validatePhone(bd.phone.trim());
    if (!bd.phone.trim() || !phoneRes.valid)
      e.phone = phoneRes.error ?? "Enter a valid Indian phone number with country code (e.g. +91 98765 43210)";
    if (!bd.email.trim())
      e.email = "Email is required for dashboard login";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bd.email))
      e.email = "Enter a valid email address";
    if (!bd.city.trim())
      e.city = "City is required";
    if (slugCheck.status === "taken")
      e.slug = "This URL is already taken";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId:   state.selectedTemplate,
          businessName: bd.name.trim(),
          phone:        bd.phone.replace(/\s/g, ""),
          email:        bd.email,
          city:         bd.city.trim(),
          slug:         bd.slug,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
          // Slug error from unique constraint — scroll user to slug field
          if (data.errors.slug) setSlugEdited(true);
        } else {
          setErrors({ _global: data.error ?? "Something went wrong" });
        }
        return;
      }

      // Store result in context
      dispatch({
        type: "SET_CONFIG_DONE",
        payload: {
          businessId: data.businessId,
          slug:       data.slug,
          bookingUrl: data.bookingUrl,
        },
      });

      goToStep("customization");
      router.push("/onboarding/customization");
    } catch {
      setErrors({ _global: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputBase = "w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-800/50 border-slate-600 text-white placeholder-slate-500 focus:border-violet-400";
  const inputError = "border-red-500/50 bg-red-500/10";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => { goBack(); router.push("/onboarding/industry-selection"); }}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xl font-bold text-violet-400">📅 AnyBooking</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-28 pt-6 sm:pt-8">
        <ProgressIndicator currentStep={state.currentStep} className="mb-8" />

        {selectedIndustry && (
          <div className="flex items-center gap-2 mb-6 bg-slate-800/60 border border-violet-500/30 rounded-full px-4 py-2 w-fit">
            <span className="text-lg">{selectedIndustry.icon}</span>
            <span className="text-sm font-semibold text-violet-300">
              {selectedIndustry.name}
            </span>
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Tell us about your business
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          This sets up your profile and booking page.
        </p>

        {errors._global && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
            {errors._global}
          </div>
        )}

        <div className="space-y-5">
          {/* Business Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">
              Business Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={bd.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="e.g. Salon Bliss, Dr. Sharma Clinic"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                  errors.name
                    ? inputError
                    : "border-slate-600 bg-slate-800/50 text-white placeholder-slate-500 focus:border-violet-400"
                }`}
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">
              WhatsApp / Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="tel"
                value={bd.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="+91 98765 43210"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                  errors.phone
                    ? inputError
                    : "border-slate-600 bg-slate-800/50 text-white placeholder-slate-500 focus:border-violet-400"
                }`}
              />
            </div>
            {errors.phone ? (
              <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Include country code +91 for India. Confirmations & reminders sent via WhatsApp.
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={bd.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="hello@yourbusiness.com"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                  errors.email
                    ? inputError
                    : "border-slate-600 bg-slate-800/50 text-white placeholder-slate-500 focus:border-violet-400"
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">
              City <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={bd.city}
                onChange={(e) => setField("city", e.target.value)}
                placeholder="Bangalore"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                  errors.city
                    ? inputError
                    : "border-slate-600 bg-slate-800/50 text-white placeholder-slate-500 focus:border-violet-400"
                }`}
              />
            </div>
            {errors.city && (
              <p className="mt-1 text-xs text-red-500">{errors.city}</p>
            )}
          </div>

          {/* Booking URL slug */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">
              Your Booking Page URL
            </label>
            <div
              className={`flex items-stretch rounded-xl overflow-hidden border focus-within:ring-2 focus-within:ring-violet-400 focus-within:border-violet-400 ${
                errors.slug || slugCheck.status === "taken"
                  ? "border-red-500/50 bg-red-500/10"
                  : slugCheck.status === "available"
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-slate-600 bg-slate-800/50"
              }`}
            >
              <span className="flex items-center px-3 bg-slate-800 text-slate-400 text-sm font-mono border-r border-slate-600 shrink-0">
                anybooking.app/
              </span>
              <input
                type="text"
                value={bd.slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder="your-business"
                className={`flex-1 min-w-0 py-3 px-3 pr-10 text-sm font-mono bg-transparent focus:outline-none placeholder:text-slate-500 text-white ${
                  errors.slug || slugCheck.status === "taken"
                    ? "text-red-300"
                    : ""
                }`}
              />
              <div className="flex items-center pr-3 shrink-0">
                {slugCheck.status === "checking" && (
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                )}
                {slugCheck.status === "available" && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
                {slugCheck.status === "taken" && (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>
            {(errors.slug || slugCheck.message) && (
              <p
                className={`mt-1 text-xs ${
                  slugCheck.status === "available" ? "text-green-600" : "text-red-500"
                }`}
              >
                {errors.slug || slugCheck.message}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-sm border-t border-slate-800 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || slugCheck.status === "taken"}
            className="w-full flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl py-4 text-base transition-all duration-200"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up your business…
              </>
            ) : (
              <>
                Create My Booking Page
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
