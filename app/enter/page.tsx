"use client";

// ============================================================
// LogicAutomate — Enter / Portal
// Owner sign-in (Google + email), Staff, Create business
// ============================================================

import Link from "next/link";
import { LayoutDashboard, UserCog, Calendar, ArrowRight } from "lucide-react";
import { GoogleSignInButton } from "@/components/landing/GoogleSignInButton";

export default function EnterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
      <div className="max-w-2xl mx-auto px-4 py-16 sm:py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-violet-600 mb-8 transition-colors"
        >
          ← Back to home
        </Link>

        {/* Logo & Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-3">
            <span className="text-violet-600">Logic</span>Automate
          </h1>
          <p className="text-lg text-gray-600">
            Appointment booking for salons, clinics, and service businesses
          </p>
        </div>

        {/* Cards */}
        <div className="space-y-4">
          {/* Owner Dashboard — Google sign-in */}
          <div className="p-5 rounded-2xl bg-white border-2 border-violet-100 shadow-violet-100 transition-all duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6 text-violet-600" />
              </div>
              <div className="text-left">
                <h2 className="font-bold text-gray-900 text-lg">Owner Dashboard</h2>
                <p className="text-sm text-gray-500">Manage bookings, staff, and analytics</p>
              </div>
            </div>
            <GoogleSignInButton variant="card" redirectTo="/dashboard">
              Continue with Google
            </GoogleSignInButton>
            <p className="text-center text-sm text-gray-500 mt-3">
              Or{" "}
              <Link href="/login" className="text-violet-600 font-medium hover:underline">
                sign in with email
              </Link>
            </p>
          </div>

          <Link
            href="/staff/login"
            className="flex items-center justify-between w-full p-5 rounded-2xl bg-white border-2 border-slate-100 hover:border-slate-300 hover:shadow-lg shadow-slate-100 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                <UserCog className="w-6 h-6 text-pink-600" />
              </div>
              <div className="text-left">
                <h2 className="font-bold text-gray-900 text-lg">Staff Portal</h2>
                <p className="text-sm text-gray-500">View schedule, complete appointments</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/onboarding/industry-selection"
            className="flex items-center justify-between w-full p-5 rounded-2xl bg-white border-2 border-emerald-100 hover:border-emerald-300 hover:shadow-lg shadow-emerald-100 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                <Calendar className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-left">
                <h2 className="font-bold text-gray-900 text-lg">Create your business</h2>
                <p className="text-sm text-gray-500">Set up in ~3 minutes, start taking bookings</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-500 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          Customers book via your link:{" "}
          <span className="font-mono text-gray-600">logicautomate.app/your-business</span>
        </p>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
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
