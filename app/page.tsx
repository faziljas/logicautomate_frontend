"use client";

// ============================================================
// AnyBooking — Landing Page (Root)
// Compact layout, modern creative design
// ============================================================

import Link from "next/link";
import { ArrowRight, Calendar, Users, Bell } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-72 h-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-violet-600/15 blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header — compact */}
        <header className="flex items-center justify-between mb-8 sm:mb-10">
          <span className="text-lg sm:text-xl font-bold tracking-tight">
            <span className="text-violet-400">Any</span>Booking
          </span>
          <nav className="flex items-center gap-4 sm:gap-6 text-sm">
            <Link
              href="/pricing"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-slate-300 hover:text-white transition-colors font-medium"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-semibold text-sm transition-colors"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>
        </header>

        {/* Hero — tighter, no huge gaps */}
        <section className="text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 tracking-tight leading-tight">
            Appointment booking for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
              salons, clinics
            </span>{" "}
            and service businesses
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-6 sm:mb-8">
            Set up in minutes. Customers book 24/7. One dashboard for staff and schedules.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-semibold transition-all hover:shadow-lg hover:shadow-violet-500/25"
            >
              Get started free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center py-3.5 px-6 rounded-xl border border-slate-600 text-slate-300 font-semibold hover:border-violet-500/50 hover:text-white transition-colors"
            >
              View pricing
            </Link>
          </div>
        </section>

        {/* Value props — modern cards */}
        <section className="grid sm:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {[
            {
              icon: Calendar,
              title: "Online booking",
              desc: "Your own booking page. Fewer no-shows with smart reminders.",
              gradient: "from-violet-500/20 to-violet-600/5",
              border: "border-violet-500/20",
            },
            {
              icon: Users,
              title: "Staff & calendar",
              desc: "Manage staff, services, and availability in one dashboard.",
              gradient: "from-fuchsia-500/20 to-fuchsia-600/5",
              border: "border-fuchsia-500/20",
            },
            {
              icon: Bell,
              title: "Reminders",
              desc: "Email, SMS, and WhatsApp so customers show up and you stay full.",
              gradient: "from-violet-500/20 to-fuchsia-500/10",
              border: "border-violet-500/20",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`group p-5 sm:p-6 rounded-2xl bg-slate-900/50 border ${item.border} backdrop-blur-sm hover:bg-slate-800/50 hover:border-violet-500/30 transition-all duration-300`}
              >
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </section>

        {/* CTA */}
        <section className="text-center p-6 sm:p-10 rounded-2xl bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Ready to take bookings?
          </h2>
          <p className="text-slate-400 mb-5 max-w-md mx-auto text-sm sm:text-base">
            Create your business in a few minutes. No credit card required.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 py-3 px-5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-semibold text-sm transition-colors"
          >
            Sign in or get started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        {/* Footer */}
        <footer className="mt-12 sm:mt-14 pt-6 border-t border-slate-800 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
          <Link href="/pricing" className="hover:text-violet-400 transition-colors">
            Pricing
          </Link>
          <Link href="/privacy" className="hover:text-violet-400 transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-violet-400 transition-colors">
            Terms
          </Link>
        </footer>
      </div>
    </div>
  );
}
