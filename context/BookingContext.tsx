"use client";

// ============================================================
// BookFlow — Booking Page State (React Context + sessionStorage)
// ============================================================

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export interface ServiceOption {
  id: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  price: number;
  advance_amount: number;
  category?: string | null;
}

export interface StaffOption {
  id: string;
  name: string;
  role_name: string;
  rating?: number;
  total_reviews?: number;
  avatar_url?: string;
  specializations?: string[];
}

export interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  customFields: Record<string, unknown>;
}

const STORAGE_KEY = "bookflow-booking";

interface BookingState {
  selectedService: ServiceOption | null;
  selectedStaffId: string | null;
  selectedDate: string | null;
  selectedTime: string | null;
  customerDetails: CustomerFormData;
  viewingCount: number;
}

interface BookingContextValue extends BookingState {
  setSelectedService: (s: ServiceOption | null) => void;
  setSelectedStaff: (id: string | null) => void;
  setSelectedDate: (d: string | null) => void;
  setSelectedTime: (t: string | null) => void;
  setCustomerDetails: (d: CustomerFormData) => void;
  setViewingCount: (n: number) => void;
  reset: () => void;
}

const BLANK_CUSTOMER: CustomerFormData = {
  name: "",
  phone: "",
  email: "",
  customFields: {},
};

function loadFromStorage(slug: string): Partial<BookingState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEY}-${slug}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      selectedService: parsed.selectedService ?? null,
      selectedStaffId: parsed.selectedStaffId ?? null,
      selectedDate: parsed.selectedDate ?? null,
      selectedTime: parsed.selectedTime ?? null,
      customerDetails: parsed.customerDetails ?? BLANK_CUSTOMER,
    };
  } catch {
    return {};
  }
}

function saveToStorage(slug: string, state: Partial<BookingState>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      `${STORAGE_KEY}-${slug}`,
      JSON.stringify({
        selectedService: state.selectedService,
        selectedStaffId: state.selectedStaffId,
        selectedDate: state.selectedDate,
        selectedTime: state.selectedTime,
        customerDetails: state.customerDetails,
      })
    );
  } catch {
    // ignore
  }
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({
  children,
  businessSlug,
}: {
  children: ReactNode;
  businessSlug: string;
}) {
  const [state, setState] = useState<BookingState>(() => {
    const loaded = typeof window !== "undefined" ? loadFromStorage(businessSlug) : {};
    return {
      selectedService: loaded.selectedService ?? null,
      selectedStaffId: loaded.selectedStaffId ?? null,
      selectedDate: loaded.selectedDate ?? null,
      selectedTime: loaded.selectedTime ?? null,
      customerDetails: loaded.customerDetails ?? BLANK_CUSTOMER,
      viewingCount: 0,
    };
  });

  useEffect(() => {
    const loaded = loadFromStorage(businessSlug);
    setState((prev) => ({
      ...prev,
      selectedService: loaded.selectedService ?? prev.selectedService,
      selectedStaffId: loaded.selectedStaffId ?? prev.selectedStaffId,
      selectedDate: loaded.selectedDate ?? prev.selectedDate,
      selectedTime: loaded.selectedTime ?? prev.selectedTime,
      customerDetails: loaded.customerDetails ?? prev.customerDetails,
    }));
  }, [businessSlug]);

  useEffect(() => {
    saveToStorage(businessSlug, state);
  }, [businessSlug, state.selectedService, state.selectedStaffId, state.selectedDate, state.selectedTime, state.customerDetails]);

  const setSelectedService = useCallback((s: ServiceOption | null) => {
    setState((prev) => ({
      ...prev,
      selectedService: s,
      selectedStaffId: null,
      selectedDate: null,
      selectedTime: null,
    }));
  }, []);

  const setSelectedStaff = useCallback((id: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedStaffId: id,
      selectedDate: null,
      selectedTime: null,
    }));
  }, []);

  const setSelectedDate = useCallback((d: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedDate: d,
      selectedTime: null,
    }));
  }, []);

  const setSelectedTime = useCallback((t: string | null) => {
    setState((prev) => ({ ...prev, selectedTime: t }));
  }, []);

  const setCustomerDetails = useCallback((d: CustomerFormData) => {
    setState((prev) => ({ ...prev, customerDetails: d }));
  }, []);

  const setViewingCount = useCallback((n: number) => {
    setState((prev) => ({ ...prev, viewingCount: n }));
  }, []);

  const reset = useCallback(() => {
    setState({
      selectedService: null,
      selectedStaffId: null,
      selectedDate: null,
      selectedTime: null,
      customerDetails: BLANK_CUSTOMER,
      viewingCount: 0,
    });
  }, []);

  const value: BookingContextValue = {
    ...state,
    setSelectedService,
    setSelectedStaff,
    setSelectedDate,
    setSelectedTime,
    setCustomerDetails,
    setViewingCount,
    reset,
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
