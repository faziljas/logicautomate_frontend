"use client";

// ============================================================
// LogicAutomate — Landing Page (Root)
// Marketing page: no sign-in. CTAs go to /enter for sign-in.
// ============================================================

import Link from "next/link";
import { ArrowRight, Calendar, Users, Bell } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
        {/* Header */}
        <header className="flex items-center justify-between mb-16 sm:mb-24">
          <span className="text-xl font-bold text-gray-900">
            <span className="text-violet-600">Logic</span>Automate
          </span>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/pricing" className="text-gray-600 hover:text-violet-600 transition-colors">
              Pricing
            </Link>
            <Link href="/login" className="text-violet-600 font-semibold hover:text-violet-700">
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="text-center mb-20 sm:mb-28">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Appointment booking for{" "}
            <span className="text-violet-600">salons, clinics</span> and service businesses
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Set up in minutes. Let customers book 24/7. Manage staff and schedules in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-4 px-8 rounded-xl bg-violet-600 text-white font-semibold text-lg hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200"
            >
              Get started free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center py-4 px-8 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:border-violet-300 hover:bg-violet-50/50 transition-colors"
            >
              View pricing
            </Link>
          </div>
        </section>

        {/* Value props */}
        <section className="grid sm:grid-cols-3 gap-6 mb-20 sm:mb-28">
          <div className="p-6 rounded-2xl bg-white border border-violet-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5 text-violet-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Online booking</h3>
            <p className="text-sm text-gray-600">
              Your own booking page. Customers book anytime; you get fewer no-shows with reminders.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-violet-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Staff & calendar</h3>
            <p className="text-sm text-gray-600">
              Manage staff, services, and availability. One dashboard for your whole team.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-violet-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
              <Bell className="w-5 h-5 text-violet-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Reminders</h3>
            <p className="text-sm text-gray-600">
              Email, SMS, and WhatsApp reminders so customers show up and you stay full.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center p-8 sm:p-12 rounded-3xl bg-white border-2 border-violet-100 shadow-violet-100/50">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Ready to take bookings?
          </h2>
          <p className="text-gray-600 mb-6 max-w-lg mx-auto">
            Create your business in a few minutes. No credit card required.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors"
          >
            Sign in or get started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-gray-200 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
          <Link href="/pricing" className="hover:text-violet-600 transition-colors">
            Pricing
          </Link>
          <Link href="/privacy" className="hover:text-violet-600 transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-violet-600 transition-colors">
            Terms
          </Link>
        </footer>
      </div>
    </div>
  );
}
