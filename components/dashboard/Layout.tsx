"use client";

// ============================================================
// BookFlow — Dashboard Layout
// Sidebar + top bar, mobile-responsive.
// ============================================================

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCog,
  Scissors,
  BarChart3,
  Settings,
  Menu,
  X,
  Bell,
  LogOut,
  ChevronDown,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { cn } from "@/lib/utils";
import { subscribeToNewBookings } from "@/lib/dashboard/realtime";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/dashboard/bookings", label: "Bookings", icon: Calendar },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/staff", label: "Staff", icon: UserCog },
  { href: "/dashboard/services", label: "Services", icon: Scissors },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/whatsapp-logs", label: "WhatsApp Logs", icon: MessageSquare, ownerOnly: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, ownerOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { business, role, signOut, terminology, loading } = useDashboard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [newBookingBadge, setNewBookingBadge] = useState(false);

  // Redirect to /enter if no business (after loading completes)
  useEffect(() => {
    if (!loading && !business) {
      router.replace("/enter");
    }
  }, [loading, business, router]);

  useEffect(() => {
    if (!business?.id) return;
    const unsubscribe = subscribeToNewBookings(business.id, () => {
      setNewBookingBadge(true);
    });
    return unsubscribe;
  }, [business?.id]);

  const filteredNav = NAV_ITEMS.filter(
    (item) => !item.ownerOnly || role === "owner"
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 transform bg-white border-r border-slate-200 transition-transform duration-200 ease-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between px-4 border-b border-slate-100 lg:justify-start">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-lg font-bold text-violet-600">LogicAutomate</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-0.5">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-violet-50 text-violet-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 pt-3 border-t border-slate-200">
              <Link
                href="/pricing"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold bg-violet-500 text-white hover:bg-violet-600 transition-colors"
              >
                <Sparkles className="w-5 h-5 shrink-0" />
                Upgrade to Pro
              </Link>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-slate-900 truncate">
            {business?.name ?? "Dashboard"}
          </h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => { setNotificationsOpen(!notificationsOpen); setNewBookingBadge(false); }}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {newBookingBadge && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-violet-500" id="notification-badge" />
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-1 w-72 rounded-xl border border-slate-200 bg-white shadow-lg py-2 z-50">
                  <div className="px-3 py-2 text-sm text-slate-500 border-b border-slate-100">
                    Notifications
                  </div>
                  <div className="px-3 py-4 text-sm text-slate-400 text-center">
                    No new notifications
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-sm font-medium">
                  {business?.name?.[0] ?? "U"}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-slate-200 bg-white shadow-lg py-1 z-50">
                    <Link
                      href="/pricing"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50"
                    >
                      <Sparkles className="w-4 h-4" /> Upgrade to Pro
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Settings className="w-4 h-4" /> Settings
                    </Link>
                    <button
                      onClick={() => { signOut(); setUserMenuOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
