"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useStaff } from "@/context/StaffContext";

export default function StaffLoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useStaff();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    router.replace("/staff");
    return null;
  }

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/staff/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setStep("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/staff/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");
      setAuth(data.token, data.staff, data.business);
      router.replace("/staff");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-pink-50 to-white px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <Link
          href="/enter"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-center text-xl font-bold text-slate-900">LogicAutomate Staff</h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          Sign in with your staff phone number
        </p>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={sendOtp} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-slate-800"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-pink-500 py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="mt-6 space-y-4">
            <p className="text-sm text-slate-600">
              Code sent to <strong>{phone}</strong>
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 6-digit OTP"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-center text-lg tracking-widest"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-pink-500 py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Verify & sign in"}
            </button>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="w-full text-sm text-pink-600"
            >
              Change number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
