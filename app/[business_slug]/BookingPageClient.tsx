"use client";

// ============================================================
// BookFlow — Public Booking Page (Client)
// Step-based flow: Service → Staff → DateTime → Details → Summary → Payment
// Template-aware styling, sessionStorage persistence
// ============================================================

import { useState, useCallback, useEffect, useRef } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { BookingProvider, useBooking } from "@/context/BookingContext";
import { Header } from "@/components/booking-page/Header";
import { ServiceGrid } from "@/components/booking-page/ServiceGrid";
import { StaffSelector } from "@/components/booking-page/StaffSelector";
import { DateTimePicker } from "@/components/booking-page/DateTimePicker";
import { CustomerForm } from "@/components/booking-page/CustomerForm";
import { BookingSummary } from "@/components/booking-page/BookingSummary";
import RazorpayCheckout from "@/components/booking/RazorpayCheckout";
import type { TemplateConfig } from "@/lib/templates/types";
import { validatePhone } from "@/lib/phone-utils";

type Step =
  | "service"
  | "staff"
  | "datetime"
  | "details"
  | "summary"
  | "payment"
  | "confirmed";

const STEP_ORDER: Step[] = [
  "service",
  "staff",
  "datetime",
  "details",
  "summary",
  "payment",
  "confirmed",
];

interface BusinessData {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  custom_config: TemplateConfig;
}

interface ServiceData {
  id: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  price: number;
  advance_amount: number;
  category?: string | null;
}

interface StaffData {
  id: string;
  name: string;
  role_name: string;
  rating?: number | null;
  total_reviews?: number | null;
  avatar_url?: string | null;
  specializations?: string[];
}

interface BookingPageClientProps {
  initialData: {
    business: BusinessData;
    services: ServiceData[];
    staff: StaffData[];
  };
  slug: string;
}

function BookingFlowInner({
  initialData,
  slug,
}: {
  initialData: BookingPageClientProps["initialData"];
  slug: string;
}) {
  const { business, services, staff } = initialData;
  const config = business.custom_config;
  const terminology = config?.terminology;
  const branding = config?.branding;
  const primaryColor = branding?.primary_color ?? "#7C3AED";
  const secondaryColor = branding?.secondary_color ?? "#a78bfa";
  const industryIcon = branding?.icon ?? "📅";

  const {
    selectedService,
    selectedStaffId,
    selectedDate,
    selectedTime,
    customerDetails,
    viewingCount,
    setSelectedService,
    setSelectedStaff,
    setSelectedDate,
    setSelectedTime,
    setCustomerDetails,
    setViewingCount,
  } = useBooking();

  const [step, setStep] = useState<Step>("service");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const mainContentRef = useRef<HTMLElement>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulate "X people viewing" (in production: websocket/polling)
  useEffect(() => {
    const t = setInterval(() => {
      setViewingCount(Math.floor(Math.random() * 5));
    }, 5000);
    return () => clearInterval(t);
  }, [setViewingCount]);

  const selectedStaff = staff.find((s) => s.id === selectedStaffId);

  const goBack = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  }, [step]);

  const validateCustomer = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!customerDetails.name.trim()) e.name = "Name is required";
    const phoneRes = customerDetails.phone.trim()
      ? validatePhone(customerDetails.phone, "IN")
      : { valid: false, error: "Phone is required" };
    if (!customerDetails.phone.trim()) e.phone = "Phone is required";
    else if (!phoneRes.valid) e.phone = phoneRes.error ?? "Enter a valid phone number with country code";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }, [customerDetails]);

  const createBookingAndProceed = useCallback(async () => {
    if (
      !business ||
      !selectedService ||
      !selectedStaffId ||
      !selectedDate ||
      !selectedTime
    )
      return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          serviceId: selectedService.id,
          staffId:
            selectedStaffId === "any"
              ? staff[0]?.id ?? selectedStaffId
              : selectedStaffId,
          date: selectedDate,
          time: selectedTime,
          customerDetails: {
            name: customerDetails.name,
            phone: customerDetails.phone,
            email: customerDetails.email,
            customFields: customerDetails.customFields,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) setFormErrors(data.errors);
        else alert(data.error ?? "Failed to create booking");
        return;
      }

      setBookingId(data.bookingId);
      setPaymentOrderId(data.razorpayOrderId);

      if (data.advanceAmount === 0) {
        await fetch("/api/bookings/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: data.bookingId,
            razorpayOrderId: data.razorpayOrderId,
            razorpayPaymentId: "cash",
            razorpaySignature: "skip",
          }),
        });
        setStep("confirmed");
        return;
      }

      setStep("payment");
    } catch (e) {
      alert("Something went wrong. Please try again.");
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    business,
    selectedService,
    selectedStaffId,
    selectedDate,
    selectedTime,
    customerDetails,
    staff,
  ]);

  const handlePayAtVenue = useCallback(async () => {
    if (
      !business ||
      !selectedService ||
      !selectedStaffId ||
      !selectedDate ||
      !selectedTime
    )
      return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          serviceId: selectedService.id,
          staffId:
            selectedStaffId === "any"
              ? staff[0]?.id ?? selectedStaffId
              : selectedStaffId,
          date: selectedDate,
          time: selectedTime,
          customerDetails: {
            name: customerDetails.name,
            phone: customerDetails.phone,
            email: customerDetails.email,
            customFields: customerDetails.customFields,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setFormErrors(data.errors);
        else alert(data.error ?? "Failed to create booking");
        return;
      }
      setBookingId(data.bookingId);
      const confirmRes = await fetch("/api/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: data.bookingId,
          razorpayOrderId: data.razorpayOrderId,
          razorpayPaymentId: "cash",
          razorpaySignature: "skip",
        }),
      });
      if (confirmRes.ok) setStep("confirmed");
      else {
        const d = await confirmRes.json();
        alert(d.error ?? "Could not confirm. Please try again.");
      }
    } catch (e) {
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    business,
    selectedService,
    selectedStaffId,
    selectedDate,
    selectedTime,
    customerDetails,
    staff,
  ]);

  const handlePaymentSuccess = useCallback(
    async (paymentId: string, orderId: string, signature: string) => {
      setIsSubmitting(true);
      try {
        const res = await fetch("/api/bookings/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId,
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            razorpaySignature: signature,
          }),
        });
        if (res.ok) setStep("confirmed");
        else {
          const d = await res.json();
          alert(
            d.error ??
              "Payment verified but confirmation failed. Please contact support."
          );
        }
      } catch {
        alert("Something went wrong. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [bookingId]
  );

  const handlePayAtVenueFromPayment = useCallback(async () => {
    if (!bookingId || !paymentOrderId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          razorpayOrderId: paymentOrderId,
          razorpayPaymentId: "cash",
          razorpaySignature: "skip",
        }),
      });
      if (res.ok) setStep("confirmed");
      else {
        const d = await res.json();
        alert(d.error ?? "Could not confirm. Please try again.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [bookingId, paymentOrderId]);

  // CSS variables for template
  const cssVars = {
    "--primary-color": primaryColor,
    "--secondary-color": secondaryColor,
    "--text-color": "#1f2937",
    "--bg-color": "#f9fafb",
  } as React.CSSProperties;

  // --- CONFIRMED STATE ---
  if (step === "confirmed") {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={cssVars}
      >
        <div
          className="w-full max-w-sm text-center rounded-2xl p-6 shadow-lg"
          style={{ backgroundColor: "white" }}
        >
          <CheckCircle2
            className="w-16 h-16 mx-auto mb-4"
            style={{ color: "#10b981" }}
          />
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
            {terminology?.booking ?? "Appointment"} Confirmed! 🎉
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            You&apos;ll receive a WhatsApp confirmation on {customerDetails.phone}
          </p>
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 text-left space-y-3">
            <SummaryRow label="Service" value={selectedService?.name ?? ""} />
            <SummaryRow label="Date" value={selectedDate ?? ""} />
            <SummaryRow label="Time" value={selectedTime ?? ""} />
            <SummaryRow label="At" value={business.name} />
          </div>
          <p className="mt-5 text-xs text-gray-400">Booking ID: {bookingId}</p>
        </div>
      </div>
    );
  }

  const summaryData =
    selectedService && selectedDate && selectedTime
      ? {
          serviceName: selectedService.name,
          staffName:
            selectedStaffId === "any"
              ? `Any ${terminology?.service_provider ?? "Staff"}`
              : selectedStaff?.name ?? "Staff",
          date: selectedDate,
          time: selectedTime,
          durationMins: selectedService.duration_minutes,
          totalAmount: selectedService.price,
          advanceAmount: selectedService.advance_amount,
          businessName: business.name,
          businessAddress: business.address ?? undefined,
        }
      : null;

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={cssVars}
    >
      <Header
        businessName={business.name}
        logoUrl={business.logo_url}
        industryIcon={industryIcon}
        city={business.city}
        address={business.address}
        phone={business.phone}
        primaryColor={primaryColor}
        showBookNow={step !== "payment"}
        onBookNow={() => {
          if (step !== "service") {
            setStep("service");
          } else {
            mainContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
      />

      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {(["service", "staff", "datetime", "details", "summary"] as Step[]).map(
            (s, i) => {
              const idx = STEP_ORDER.indexOf(step);
              const sIdx = STEP_ORDER.indexOf(s);
              const isDone = sIdx < idx;
              const isCurrent = sIdx === idx;
              return (
                <div key={s} className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full transition-all ${
                      isDone
                        ? "bg-green-400"
                        : isCurrent
                        ? "scale-125"
                        : "bg-gray-200"
                    }`}
                    style={
                      isCurrent && !isDone
                        ? { backgroundColor: primaryColor }
                        : undefined
                    }
                  />
                  {i < 4 && (
                    <div
                      className={`w-6 h-0.5 ${
                        isDone ? "bg-green-300" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            }
          )}
        </div>
      </div>

      <main ref={mainContentRef} className="max-w-lg mx-auto px-4 py-6 pb-10">
        {step === "service" && (
          <ServiceGrid
            services={services}
            selectedId={selectedService?.id ?? null}
            onSelect={(s) => {
              setSelectedService(s);
              setStep("staff");
            }}
            serviceLabel={terminology?.service ?? "Service"}
            primaryColor={primaryColor}
          />
        )}

        {step === "staff" && (
          <StaffSelector
            staff={staff}
            selectedId={selectedStaffId}
            onSelect={(id) => {
              setSelectedStaff(id);
              setStep("datetime");
            }}
            providerLabel={terminology?.service_provider ?? "Staff"}
            primaryColor={primaryColor}
          />
        )}

        {step === "datetime" && selectedService && (
          <DateTimePicker
            businessId={business.id}
            serviceId={selectedService.id}
            staffId={selectedStaffId ?? "any"}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onSelectDate={(d) => {
              setSelectedDate(d);
            }}
            onSelectTime={(t) => {
              setSelectedTime(t);
              setStep("details");
            }}
            advanceDays={config?.booking_rules?.advance_booking_days ?? 30}
            minNoticeHours={config?.booking_rules?.min_advance_notice_hours ?? 1}
            primaryColor={primaryColor}
            viewingCount={viewingCount}
          />
        )}

        {step === "details" && (
          <div>
            <CustomerForm
              value={customerDetails}
              onChange={setCustomerDetails}
              templateFields={config?.customer_fields ?? []}
              errors={formErrors}
              primaryColor={primaryColor}
            />
            <button
              onClick={() => {
                if (validateCustomer()) setStep("summary");
              }}
              className="mt-6 w-full py-4 rounded-xl font-bold text-white text-base transition-all"
              style={{ backgroundColor: primaryColor }}
            >
              Review Booking →
            </button>
          </div>
        )}

        {step === "summary" && summaryData && (
          <BookingSummary
            data={summaryData}
            primaryColor={primaryColor}
            isSubmitting={isSubmitting}
            onBack={goBack}
            onConfirm={createBookingAndProceed}
            showPayAtVenue
            onPayAtVenue={handlePayAtVenue}
          />
        )}

        {step === "payment" && bookingId && selectedService && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              Complete Payment
            </h2>
            <p className="text-sm text-gray-600">
              Pay ₹
              {(selectedService.advance_amount ?? 0).toLocaleString()} advance to
              confirm your booking.
            </p>
            {paymentError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {paymentError}
              </div>
            )}
            <RazorpayCheckout
              bookingId={bookingId}
              businessName={business.name}
              serviceName={selectedService.name}
              primaryColor={primaryColor}
              logoUrl={business.logo_url ?? undefined}
              onSuccess={handlePaymentSuccess}
              onFailure={(msg) => setPaymentError(msg)}
              onDismiss={() => setPaymentError(null)}
              autoOpen
            />
            <button
              onClick={handlePayAtVenueFromPayment}
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl font-medium text-gray-600 text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Pay at venue instead
            </button>
            <button
              onClick={() => setStep("summary")}
              disabled={isSubmitting}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to summary
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  );
}

export function BookingPageClient(props: BookingPageClientProps) {
  return (
    <BookingProvider businessSlug={props.slug}>
      <BookingFlowInner {...props} />
    </BookingProvider>
  );
}
