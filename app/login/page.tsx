"use client";

// ============================================================
// LogicAutomate — Sign in (Google + magic link) — Dark
// ============================================================

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LoginPage() {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Enter your email address");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/enter`,
        },
      });
      if (err) {
        setError(err.message ?? "Failed to send magic link");
        return;
      }
      setSent(true);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn(e: React.MouseEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=/enter`,
        },
      });
      if (err) {
        setError(err.message ?? "Google sign-in failed");
        return;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const darkCard = "bg-slate-900/80 border border-slate-700/50 rounded-2xl backdrop-blur-sm";
  const darkInput = "bg-slate-800/50 border border-slate-600 text-white placeholder-slate-500 focus:ring-violet-500 focus:border-violet-500";
  const darkLink = "text-slate-400 hover:text-violet-400 transition-colors";

  if (sent) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
        <div className={`relative max-w-md w-full ${darkCard} p-8 text-center`}>
          <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-slate-400 mb-6">
            We sent a sign-in link to <strong className="text-white">{email}</strong>. Click the link to continue.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Didn&apos;t receive it? Check spam or{" "}
            <button
              type="button"
              onClick={() => { setSent(false); setError(null); }}
              className="text-violet-400 font-medium hover:underline"
            >
              try again
            </button>
          </p>
          <Link href="/" className={`inline-flex items-center gap-2 text-sm ${darkLink}`}>
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
      <div className={`relative max-w-md w-full ${darkCard} p-8`}>
        <Link href="/" className={`inline-flex items-center gap-2 text-sm ${darkLink} mb-6`}>
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
        <h1 className="text-2xl font-bold text-white mb-2">
          One sign-in. Your whole business, one place.
        </h1>
        <p className="text-slate-400 mb-6">
          Use your email or Google to reach your dashboard—bookings, staff, and customers in one place.
        </p>

        <form onSubmit={handleMagicLink} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className={`w-full px-4 py-3 rounded-xl outline-none transition-colors ${darkInput}`}
            />
          </div>
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
            {loading ? "Sending…" : "Send sign-in link"}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-slate-900 px-4 text-slate-500">Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-600 hover:border-violet-500/50 bg-slate-800/30 hover:bg-slate-800/50 text-slate-200 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-sm text-slate-500 mt-6">
          New? Sign in first — you&apos;ll then see the option to{" "}
          <Link href="/onboarding/industry-selection" className="text-violet-400 font-medium hover:underline">
            create your business
          </Link>{" "}
          on the next screen.
        </p>
      </div>
    </div>
  );
}
