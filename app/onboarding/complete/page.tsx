"use client";

// ============================================================
// BookFlow — Step 4: Complete 🎉
// app/onboarding/complete/page.tsx
// ============================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy, Check, ExternalLink, ArrowRight,
  Share2, Sparkles, LayoutDashboard
} from "lucide-react";
import { useOnboarding } from "@/context/OnboardingContext";
import { ProgressIndicator } from "@/components/onboarding/ProgressIndicator";
import { INDUSTRY_LIST } from "@/components/onboarding/IndustryCard";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// ─────────────────────────────────────────
// CONFETTI (lightweight CSS-only particles)
// ─────────────────────────────────────────
const CONFETTI_COLORS = [
  "#FF69B4", "#7C3AED", "#10B981", "#F59E0B",
  "#EF4444", "#3B82F6", "#8B5CF6", "#EC4899",
];

function ConfettiPiece({ index }: { index: number }) {
  const color  = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left   = `${Math.random() * 100}%`;
  const delay  = `${Math.random() * 2}s`;
  const size   = `${6 + Math.random() * 6}px`;
  const rotate = `${Math.random() * 360}deg`;

  return (
    <div
      className="absolute top-0 rounded-sm animate-confetti pointer-events-none"
      style={{
        left,
        width:  size,
        height: size,
        backgroundColor: color,
        animationDelay: delay,
        transform: `rotate(${rotate})`,
      }}
    />
  );
}

function Confetti() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-50">
      {Array.from({ length: 60 }).map((_, i) => (
        <ConfettiPiece key={i} index={i} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// SHARE BUTTON
// ─────────────────────────────────────────
function ShareButton({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon:      React.ElementType;
  label:     string;
  onClick:   () => void;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95",
        className
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// ─────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────
export default function CompletePage() {
  const router  = useRouter();
  const { state, dispatch } = useOnboarding();
  const supabase = createClientComponentClient();

  const [copied,       setCopied]       = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const [businessSlug, setBusinessSlug] = useState<string | null>(state.createdBusinessSlug);
  const [loadingSlug, setLoadingSlug] = useState(false);

  const selectedIndustry = INDUSTRY_LIST.find(
    (i) => i.id === state.selectedTemplate
  );

  // Fetch business slug if missing
  useEffect(() => {
    if (!businessSlug && state.createdBusinessId) {
      setLoadingSlug(true);
      supabase
        .from("businesses")
        .select("slug")
        .eq("id", state.createdBusinessId)
        .single()
        .then(({ data, error }) => {
          if (!error && data?.slug) {
            setBusinessSlug(data.slug);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingSlug(false));
    }
  }, [businessSlug, state.createdBusinessId, supabase]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://logicautomate.app";
  const bookingUrl = state.bookingUrl ?? (businessSlug ? `${baseUrl}/${businessSlug}` : null);

  // Hide confetti after 5s
  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(t);
  }, []);

  function copyLink() {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareOnWhatsApp() {
    if (!bookingUrl) return;
    const text = encodeURIComponent(
      `Book an appointment with us! 📅\n${bookingUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  function shareOnInstagram() {
    if (!bookingUrl) return;
    // Instagram doesn't support URL sharing via web; open link copy modal
    copyLink();
    window.open("https://www.instagram.com/", "_blank");
  }

  function goToDashboard() {
    // Clear onboarding session state
    try { sessionStorage.removeItem("bookflow_onboarding"); } catch {}
    dispatch({ type: "RESET" });
    router.push("/enter"); // Go to /enter to show Dashboard + Staff Portal options
  }

  return (
    <>
      {/* Confetti */}
      {showConfetti && <Confetti />}

      <div className="min-h-screen bg-slate-950 text-white">
        <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm">
          <div className="max-w-lg mx-auto px-4 py-4">
            <span className="text-xl font-bold text-violet-400">📅 LogicAutomate</span>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 pb-28 pt-6 sm:pt-8">
          <ProgressIndicator currentStep="complete" className="mb-8" />

          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <span className="text-6xl animate-bounce inline-block">🎉</span>
              <span className="absolute -top-1 -right-2 text-2xl animate-spin-slow">✨</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Complete!</span>
            </h1>
            <p className="text-slate-400 text-base mb-4">
              Your booking page is live! Share the link below and start accepting appointments right away.
            </p>
          </div>

          <div className="relative bg-slate-900/80 rounded-2xl border border-slate-700 p-6 mb-6 overflow-hidden">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                background: `linear-gradient(135deg, ${selectedIndustry?.primaryColor ?? "#7C3AED"}, transparent)`,
              }}
            />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{selectedIndustry?.icon ?? "🏢"}</span>
                <div>
                  <h2 className="font-bold text-white text-lg leading-tight">
                    {state.businessDetails.name || "Your Business"}
                  </h2>
                  <p className="text-sm text-slate-400">{state.businessDetails.city}</p>
                </div>
              </div>

              {loadingSlug ? (
                <div className="bg-slate-800 rounded-xl px-4 py-3 border border-slate-600 text-center">
                  <p className="text-sm text-slate-400">Loading your booking URL...</p>
                </div>
              ) : bookingUrl ? (
                <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-4 py-3 border border-slate-600">
                  <span className="text-xs text-slate-400 font-medium truncate flex-1 font-mono">
                    {bookingUrl}
                  </span>
                  <button
                    onClick={copyLink}
                    className="shrink-0 flex items-center gap-1.5 bg-violet-500 hover:bg-violet-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200"
                  >
                    {copied ? (
                      <><Check className="w-3 h-3" /> Copied!</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </button>
                </div>
              ) : (
                <div className="bg-slate-800 rounded-xl px-4 py-3 border border-slate-600 text-center">
                  <p className="text-sm text-slate-400">Booking URL will be available shortly</p>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Share2 className="w-4 h-4" /> Share your booking page
            </p>
            <div className="flex flex-wrap gap-2">
              <ShareButton
                icon={({ className }: { className?: string }) => (
                  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.893 16.836c-.249.69-.907 1.265-1.567 1.496-.66.231-4.073.28-5.467-.44-1.395-.721-3.944-2.806-4.713-5.263-.77-2.456.056-4.785 1.635-5.908 1.058-.746 2.392-.699 3.258-.233.528.284.834.87.896 1.55.062.679.039 1.368.07 2.018.06 1.25.32 2.23 1.077 2.967.756.737 1.874 1.13 3.178 1.096.688-.018 1.303.208 1.665.748.361.54.35 1.36-.032 1.969z" />
                  </svg>
                )}
                label="Share on WhatsApp"
                onClick={shareOnWhatsApp}
                className="bg-green-500 hover:bg-green-600 text-white"
              />
              <ShareButton
                icon={({ className }: { className?: string }) => (
                  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                )}
                label="Copy for Instagram"
                onClick={shareOnInstagram}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              />
              <ShareButton
                icon={ExternalLink}
                label="Preview Page"
                onClick={() => bookingUrl && window.open(bookingUrl, "_blank")}
                className="bg-slate-700 hover:bg-slate-600 text-white"
              />
            </div>
          </div>

          <div className="bg-slate-800/60 border border-violet-500/20 rounded-2xl p-5 mb-6">
            <p className="text-sm font-bold text-violet-300 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> What's next?
            </p>
            <ul className="space-y-2">
              {[
                "Add your staff members",
                "Connect WhatsApp Business",
                "Set up Razorpay for payments",
                "Customise your booking page colours",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </main>

        <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-sm border-t border-slate-800 px-4 py-4">
          <div className="max-w-lg mx-auto">
            <button
              onClick={goToDashboard}
              className="w-full flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-xl py-4 text-base transition-all duration-200"
            >
              <LayoutDashboard className="w-4 h-4" />
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-center text-xs text-slate-500 mt-2">
              Manage bookings, staff, and analytics from your dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Confetti animation keyframes */}
      <style jsx global>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-in forwards;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </>
  );
}
