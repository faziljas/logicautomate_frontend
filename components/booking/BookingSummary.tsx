"use client";
import { Calendar, Clock, User, MapPin, IndianRupee, AlertCircle } from "lucide-react";

export interface BookingSummaryData {
  serviceName:     string;
  staffName:       string;
  date:            string;       // YYYY-MM-DD
  time:            string;       // HH:MM
  durationMins:    number;
  totalAmount:     number;
  advanceAmount:   number;
  businessName:    string;
  businessAddress?: string;
  currency?:       string;
}

interface BookingSummaryProps {
  data:             BookingSummaryData;
  onConfirm:        () => void;
  onBack:           () => void;
  isSubmitting?:    boolean;
  primaryColor?:    string;
  onPayAtVenue?:    () => void;
  showPayAtVenue?:  boolean;
}

export function BookingSummary({
  data,
  onConfirm,
  onBack,
  isSubmitting = false,
  primaryColor = "#7C3AED",
  onPayAtVenue,
  showPayAtVenue = false,
}: BookingSummaryProps) {
  const remaining = data.totalAmount - data.advanceAmount;

  const dateLabel = new Date(data.date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  });

  const [h, m]    = data.time.split(":").map(Number);
  const period    = h < 12 ? "AM" : "PM";
  const hour      = h % 12 || 12;
  const timeLabel = `${hour}:${String(m).padStart(2, "0")} ${period}`;

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Booking Summary</h2>

      {/* Summary card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Accent header */}
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}88)` }}
        />

        <div className="p-5 space-y-3.5">
          <Row icon={<span className="text-base">💆</span>} label="Service" value={data.serviceName} />
          <Row icon={<User className="w-4 h-4 text-gray-400" />} label="With" value={data.staffName} />
          <Row icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Date" value={dateLabel} />
          <Row
            icon={<Clock className="w-4 h-4 text-gray-400" />}
            label="Time"
            value={`${timeLabel} · ${data.durationMins} mins`}
          />
          {data.businessAddress && (
            <Row
              icon={<MapPin className="w-4 h-4 text-gray-400" />}
              label="Location"
              value={data.businessName + (data.businessAddress ? `, ${data.businessAddress}` : "")}
            />
          )}

          <div className="border-t border-gray-100 pt-3.5 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total amount</span>
              <span className="font-semibold text-gray-800">
                ₹{data.totalAmount.toLocaleString()}
              </span>
            </div>
            {data.advanceAmount > 0 && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-violet-600 font-medium">Pay now (advance)</span>
                  <span className="font-bold text-violet-600">
                    ₹{data.advanceAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Pay at venue</span>
                  <span className="text-gray-500">₹{remaining.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation notice */}
      <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          Free cancellation up to 2 hours before your appointment.
        </p>
      </div>

      {/* Action buttons */}
      <div className="mt-5 space-y-2">
        <button
          onClick={onConfirm}
          disabled={isSubmitting}
          className="w-full py-4 rounded-xl font-bold text-white text-base transition-all duration-200 disabled:opacity-60"
          style={{ backgroundColor: primaryColor }}
        >
          {isSubmitting
            ? "Processing…"
            : data.advanceAmount > 0
            ? `Pay ₹${data.advanceAmount.toLocaleString()} & Confirm`
            : "Confirm Booking"}
        </button>
        {showPayAtVenue && data.advanceAmount > 0 && onPayAtVenue && (
          <button
            onClick={onPayAtVenue}
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl font-medium text-gray-600 text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Pay at venue instead
          </button>
        )}
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl font-semibold text-gray-600 text-sm bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
        <span className="text-xs text-gray-400 shrink-0">{label}</span>
        <span className="text-sm font-medium text-gray-800 text-right">{value}</span>
      </div>
    </div>
  );
}
