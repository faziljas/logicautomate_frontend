// ============================================================
// BookFlow — Dashboard Layout (App Router)
// Wraps all dashboard routes with DashboardProvider + Layout.
// ============================================================

import { DashboardProvider } from "@/context/DashboardContext";
import DashboardLayout from "@/components/dashboard/Layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </DashboardProvider>
  );
}
