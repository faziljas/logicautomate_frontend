"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

const STAFF_TOKEN_KEY = "bookflow_staff_token";
const STAFF_USER_KEY = "bookflow_staff_user";

export interface StaffUser {
  id: string;
  businessId: string;
  userId: string;
  roleName: string;
  workingHours: Record<string, { start: string; end: string }>;
  rating?: number;
  totalReviews?: number;
}

export interface StaffBusiness {
  id: string;
  name: string;
  slug: string;
}

interface StaffState {
  token: string | null;
  staff: StaffUser | null;
  business: StaffBusiness | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const StaffContext = createContext<
  StaffState & {
    setAuth: (token: string, staff: StaffUser, business: StaffBusiness | null) => void;
    logout: () => void;
    getToken: () => string | null;
  }
>(null as any);

export function StaffProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<StaffState>({
    token: null,
    staff: null,
    business: null,
    loading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(STAFF_TOKEN_KEY);
    const raw = localStorage.getItem(STAFF_USER_KEY);
    if (token && raw) {
      try {
        const { staff, business } = JSON.parse(raw);
        setState({
          token,
          staff,
          business,
          loading: false,
          isAuthenticated: true,
        });
      } catch {
        localStorage.removeItem(STAFF_TOKEN_KEY);
        localStorage.removeItem(STAFF_USER_KEY);
        setState((s) => ({ ...s, loading: false }));
      }
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const setAuth = useCallback((token: string, staff: StaffUser, business: StaffBusiness | null) => {
    localStorage.setItem(STAFF_TOKEN_KEY, token);
    localStorage.setItem(STAFF_USER_KEY, JSON.stringify({ staff, business }));
    setState({
      token,
      staff,
      business,
      loading: false,
      isAuthenticated: true,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STAFF_TOKEN_KEY);
    localStorage.removeItem(STAFF_USER_KEY);
    setState({
      token: null,
      staff: null,
      business: null,
      loading: false,
      isAuthenticated: false,
    });
    router.push("/staff");
  }, [router]);

  const getToken = useCallback(() => {
    return typeof window !== "undefined" ? localStorage.getItem(STAFF_TOKEN_KEY) : null;
  }, []);

  return (
    <StaffContext.Provider
      value={{
        ...state,
        setAuth,
        logout,
        getToken,
      }}
    >
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error("useStaff must be used within StaffProvider");
  return ctx;
}
