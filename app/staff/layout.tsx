"use client";

import React, { useEffect } from "react";
import { StaffProvider, useStaff } from "@/context/StaffContext";
import { OfflineBanner } from "@/components/staff/OfflineBanner";

function RegisterSw() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.update())
      .catch(() => {});
  }, []);
  return null;
}

function StaffLayoutInner({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useStaff();

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "/manifest.json";
    document.head.appendChild(link);
    const theme = document.createElement("meta");
    theme.name = "theme-color";
    theme.content = "#FF69B4";
    document.head.appendChild(theme);
    return () => {
      document.head.removeChild(link);
      document.head.removeChild(theme);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <RegisterSw />
      <OfflineBanner />
      {children}
    </div>
  );
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffProvider>
      <StaffLayoutInner>{children}</StaffLayoutInner>
    </StaffProvider>
  );
}
