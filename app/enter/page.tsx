"use client";

// ============================================================
// LogicAutomate — Enter / Portal (post sign-in) — Dark
// ============================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, UserCog, Calendar, ArrowRight } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function EnterPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      setLoading(false);
    });
  }, [supabase.auth, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
      <div className="relative max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2">
            <span className="text-violet-400">Logic</span>Automate
          </h1>
          <p className="text-slate-400">
            Appointment booking for salons, clinics, and service businesses
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="flex items-center justify-between w-full p-5 rounded-2xl bg-slate-900/60 border border-slate-700/50 hover:border-violet-500/30 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center group-hover:bg-violet-500/30 transition-colors">
                <LayoutDashboard className="w-6 h-6 text-violet-400" />
              </div>
              <div className="text-left">
                <h2 className="font-bold text-white text-lg">Owner Dashboard</h2>
                <p className="text-sm text-slate-400">Manage bookings, staff, and analytics</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-violet-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/staff/login"
            className="flex items-center justify-between w-full p-5 rounded-2xl bg-slate-900/60 border border-slate-700/50 hover:border-slate-600 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-fuchsia-500/20 flex items-center justify-center group-hover:bg-fuchsia-500/30 transition-colors">
                <UserCog className="w-6 h-6 text-fuchsia-400" />
              </div>
              <div className="text-left">
                <h2 className="font-bold text-white text-lg">Staff Portal</h2>
                <p className="text-sm text-slate-400">View schedule, complete appointments</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/onboarding/industry-selection"
            className="flex items-center justify-between w-full p-5 rounded-2xl bg-slate-900/60 border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                <Calendar className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-left">
                <h2 className="font-bold text-white text-lg">Create your business</h2>
                <p className="text-sm text-slate-400">Set up in ~3 minutes, start taking bookings</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          Customers book via your link:{" "}
          <span className="font-mono text-slate-400">logicautomate.app/your-business</span>
        </p>

        <footer className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
          <Link href="/pricing" className="hover:text-violet-400 transition-colors">Pricing</Link>
          <Link href="/privacy" className="hover:text-violet-400 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-violet-400 transition-colors">Terms</Link>
        </footer>
      </div>
    </div>
  );
}
