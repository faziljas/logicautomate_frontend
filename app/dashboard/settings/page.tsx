"use client";

// ============================================================
// BookFlow — Settings (Owner only)
// ============================================================

import { useState } from "react";
import { Loader2, Building2, MessageSquare, CreditCard, Bell, Users } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import WhatsAppTemplateEditor from "@/components/settings/WhatsAppTemplateEditor";

export default function SettingsPage() {
  const { business, role, loading: ctxLoading } = useDashboard();
  const [activeTab, setActiveTab] = useState<
    "profile" | "whatsapp" | "payments" | "booking-rules" | "notifications" | "team"
  >("profile");

  if (ctxLoading || !business) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (role !== "owner") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p>Settings are only available to the business owner.</p>
      </div>
    );
  }

  const tabs = [
    { id: "profile" as const, label: "Business Profile", icon: Building2 },
    { id: "whatsapp" as const, label: "WhatsApp Templates", icon: MessageSquare },
    { id: "payments" as const, label: "Payment Settings", icon: CreditCard },
    { id: "booking-rules" as const, label: "Booking Rules", icon: Bell },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "team" as const, label: "Team Members", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Settings</h1>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-48 shrink-0">
          <ul className="space-y-0.5">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => setActiveTab(t.id)}
                    className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                      activeTab === t.id
                        ? "bg-violet-50 text-violet-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {t.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex-1 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {activeTab === "profile" && (
            <div>
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                Business Profile
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Edit business name, address, contact details. Use the onboarding flow or
                add a dedicated profile form here.
              </p>
              <div className="text-sm text-slate-700">
                <p><strong>Name:</strong> {business.name}</p>
                <p><strong>Slug:</strong> {business.slug}</p>
                <p>Booking URL: /{business.slug}/book</p>
              </div>
            </div>
          )}

          {activeTab === "whatsapp" && (
            <div>
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                WhatsApp Templates
              </h2>
              <WhatsAppTemplateEditor businessId={business.id} />
            </div>
          )}

          {activeTab === "payments" && (
            <div>
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                Payment Settings (Razorpay)
              </h2>
              <p className="text-sm text-slate-500">
                Configure Razorpay keys in environment variables. Key ID and webhook
                secret are required for payments. No UI for key entry for security.
              </p>
            </div>
          )}

          {activeTab === "booking-rules" && (
            <div>
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                Booking Rules
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Cancellation policy, advance payment %, booking buffer time. Stored in
                businesses.custom_config.booking_rules. Add form to edit.
              </p>
            </div>
          )}

          {activeTab === "notifications" && (
            <div>
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                Notifications
              </h2>
              <p className="text-sm text-slate-500">
                Configure email/SMS notifications for new bookings, reminders, etc.
              </p>
            </div>
          )}

          {activeTab === "team" && (
            <div>
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                Team Members
              </h2>
              <p className="text-sm text-slate-500">
                Multi-user access. Add managers and staff with different permission
                levels. Integrate with Staff Management.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
