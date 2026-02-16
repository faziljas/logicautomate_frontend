// ============================================================
// BookFlow — Check Availability API
// app/api/bookings/check-availability/route.ts
//
// POST /api/bookings/check-availability
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/booking/availability-checker";

interface CheckAvailabilityBody {
  businessId: string;
  serviceId:  string;
  staffId?:   string; // optional; defaults to "any"
  date:       string; // YYYY-MM-DD
}

export async function POST(request: NextRequest) {
  let body: CheckAvailabilityBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { businessId, serviceId, staffId = "any", date } = body;

  // ── Validation ──────────────────────────────────────────
  if (!businessId || !serviceId || !date) {
    return NextResponse.json(
      { error: "businessId, serviceId, and date are required" },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "date must be in YYYY-MM-DD format" },
      { status: 400 }
    );
  }

  // Reject past dates
  const today = new Date().toISOString().split("T")[0];
  if (date < today) {
    return NextResponse.json(
      { error: "Cannot check availability for past dates" },
      { status: 400 }
    );
  }

  try {
    const results = await getAvailableSlots(
      businessId,
      serviceId,
      staffId,
      date
    );

    // For "any" staff — merge slots across all staff and mark a slot
    // available if at least one staff member has it free.
    if (staffId === "any" && results.length > 1) {
      const mergedMap: Record<string, { available: boolean; label: string }> = {};

      for (const result of results) {
        const allSlots = [
          ...result.slots.morning,
          ...result.slots.afternoon,
          ...result.slots.evening,
        ];
        for (const slot of allSlots) {
          if (!mergedMap[slot.time]) {
            mergedMap[slot.time] = { available: false, label: slot.label };
          }
          // Available if ANY staff has this slot free
          if (slot.available) mergedMap[slot.time].available = true;
        }
      }

      const mergedFlat = Object.entries(mergedMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, { available, label }]) => ({ time, available, label }));

      const morning   = mergedFlat.filter((s) => {
        const h = parseInt(s.time.split(":")[0]);
        return h < 12;
      });
      const afternoon = mergedFlat.filter((s) => {
        const h = parseInt(s.time.split(":")[0]);
        return h >= 12 && h < 17;
      });
      const evening   = mergedFlat.filter((s) => {
        const h = parseInt(s.time.split(":")[0]);
        return h >= 17;
      });

      return NextResponse.json({
        date,
        staffId: "any",
        serviceId,
        slots:          { morning, afternoon, evening },
        totalAvailable: mergedFlat.filter((s) => s.available).length,
      });
    }

    // Single staff or no results
    const result = results[0];
    if (!result) {
      return NextResponse.json({
        date,
        staffId,
        serviceId,
        slots:          { morning: [], afternoon: [], evening: [] },
        totalAvailable: 0,
      });
    }

    return NextResponse.json({
      date,
      staffId,
      serviceId,
      durationMins:   result.durationMins,
      workingHours:   result.workingHours,
      slots:          result.slots,
      totalAvailable: result.totalAvailable,
    });
  } catch (err) {
    console.error("[check-availability]", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
