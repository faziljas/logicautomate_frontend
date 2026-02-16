"use client";

// ============================================================
// RazorpayCheckout
// Handles the complete Razorpay payment flow on the frontend.
//
// Usage:
//   <RazorpayCheckout
//     bookingId="..."
//     businessName="Glow Salon"
//     primaryColor="#10B981"
//     logoUrl="/logo.png"
//     onSuccess={(paymentId) => router.push('/confirmed')}
//     onFailure={(err) => setError(err)}
//     onDismiss={() => setStep('summary')}
//   />
// ============================================================

import React, { useEffect, useRef, useState } from "react";

// ── Razorpay types ────────────────────────────────────────────
interface RazorpayOptions {
  key:         string;
  amount:      number;
  currency:    string;
  name:        string;
  description: string;
  image?:      string;
  order_id:    string;
  handler:     (response: RazorpaySuccessResponse) => void;
  prefill?: {
    name?:    string;
    email?:   string;
    contact?: string;
  };
  notes?:  Record<string, string>;
  theme?:  { color: string };
  modal?: {
    ondismiss:     () => void;
    confirm_close: boolean;
    escape:        boolean;
  };
  retry?: { enabled: boolean; max_count: number };
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id:   string;
  razorpay_signature:  string;
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
  on: (event: string, handler: (response: { error: { description: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

// ── Props ─────────────────────────────────────────────────────
interface Props {
  bookingId:     string;
  businessName:  string;
  serviceName?:  string;
  primaryColor?: string;
  logoUrl?:      string;
  /** Auto-open checkout after component mounts */
  autoOpen?:     boolean;
  onSuccess:     (paymentId: string, orderId: string, signature: string) => void;
  onFailure:     (errorMessage: string) => void;
  onDismiss?:    () => void;
  /** Rendered as the trigger; defaults to "Pay Advance" button */
  children?:     React.ReactNode;
}

// ── Script loader ─────────────────────────────────────────────
function useRazorpayScript(): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.Razorpay) { setLoaded(true); return; }

    const script    = document.createElement("script");
    script.src      = "https://checkout.razorpay.com/v1/checkout.js";
    script.async    = true;
    script.onload   = () => setLoaded(true);
    script.onerror  = () => console.error("[RazorpayCheckout] Script load failed");
    document.body.appendChild(script);
    return () => { /* leave script in DOM for re-use */ };
  }, []);

  return loaded;
}

// ── Component ─────────────────────────────────────────────────
export default function RazorpayCheckout({
  bookingId,
  businessName,
  serviceName  = "Advance Payment",
  primaryColor = "#10B981",
  logoUrl,
  autoOpen     = false,
  onSuccess,
  onFailure,
  onDismiss,
  children,
}: Props) {
  const scriptLoaded   = useRazorpayScript();
  const [loading, setLoading]   = useState(false);
  const [orderReady, setOrderReady] = useState(false);
  const orderDataRef = useRef<{
    orderId:       string;
    amountPaise:   number;
    currency:      string;
    customerName:  string;
    customerEmail: string;
    customerPhone: string;
  } | null>(null);
  const rzInstanceRef = useRef<RazorpayInstance | null>(null);

  // ── Fetch / create Razorpay order ────────────────────────
  const prepareOrder = async () => {
    if (orderDataRef.current) return orderDataRef.current; // cached

    setLoading(true);
    try {
      const res = await fetch("/api/payments/create-order", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ bookingId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Order creation failed");

      const orderData = {
        orderId:       data.orderId,
        amountPaise:   data.amountPaise,
        currency:      data.currency ?? "INR",
        customerName:  data.customerName  ?? "",
        customerEmail: data.customerEmail ?? "",
        customerPhone: data.customerPhone ?? "",
      };

      orderDataRef.current = orderData;
      setOrderReady(true);
      return orderData;
    } catch (err: unknown) {
      onFailure(err instanceof Error ? err.message : "Failed to initiate payment");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ── Open Razorpay checkout ───────────────────────────────
  const openCheckout = async () => {
    if (!scriptLoaded) {
      onFailure("Payment gateway is loading. Please try again in a moment.");
      return;
    }

    const orderData = await prepareOrder();
    if (!orderData) return;

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!keyId) {
      onFailure("Payment is not configured. Please contact support.");
      return;
    }

    const options: RazorpayOptions = {
      key:         keyId,
      amount:      orderData.amountPaise,
      currency:    orderData.currency,
      name:        businessName,
      description: `${serviceName} – Advance Payment`,
      order_id:    orderData.orderId,
      ...(logoUrl && { image: logoUrl }),

      prefill: {
        name:    orderData.customerName,
        email:   orderData.customerEmail,
        contact: orderData.customerPhone,
      },

      notes: { booking_id: bookingId },

      theme: { color: primaryColor },

      modal: {
        ondismiss:     () => onDismiss?.(),
        confirm_close: true,
        escape:        false,
      },

      retry: { enabled: true, max_count: 3 },

      handler: (response: RazorpaySuccessResponse) => {
        onSuccess(
          response.razorpay_payment_id,
          response.razorpay_order_id,
          response.razorpay_signature,
        );
      },
    };

    const rz = new window.Razorpay(options);

    // Handle payment failure inside the modal
    rz.on("payment.failed", (response: { error: { description: string } }) => {
      onFailure(response?.error?.description ?? "Payment failed. Please try again.");
    });

    rzInstanceRef.current = rz;
    rz.open();
  };

  // Auto-open on mount if requested (e.g. after booking form submission)
  useEffect(() => {
    if (autoOpen && scriptLoaded) {
      openCheckout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, scriptLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      rzInstanceRef.current?.close();
    };
  }, []);

  // ── Render ────────────────────────────────────────────────
  if (children) {
    return (
      <div
        onClick={openCheckout}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === "Enter" && openCheckout()}
        className="contents"
      >
        {children}
      </div>
    );
  }

  return (
    <button
      onClick={openCheckout}
      disabled={loading || !scriptLoaded}
      className="w-full flex items-center justify-center gap-2 px-6 py-3
                 bg-green-600 text-white font-semibold rounded-xl
                 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed
                 transition-colors shadow-sm"
    >
      {loading ? (
        <>
          <Spinner />
          <span>Preparing payment…</span>
        </>
      ) : !scriptLoaded ? (
        <>
          <Spinner />
          <span>Loading…</span>
        </>
      ) : (
        <>
          <RazorpayLogo />
          <span>Pay Advance</span>
        </>
      )}
    </button>
  );
}

// ── Small inline icons ────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3 3 3H4z" />
    </svg>
  );
}

function RazorpayLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}
