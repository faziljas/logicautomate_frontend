// ============================================================
// BookFlow — Availability Checker Unit Tests
// __tests__/booking/availability-checker.test.ts
// ============================================================
// Pure function tests — no DB, no HTTP, no mocking needed.
// Run: npx jest __tests__/booking/availability-checker.test.ts
// ============================================================

import {
  timeToMinutes,
  minutesToTime,
  formatTimeLabel,
  getDayName,
  addMinutes,
  getPeriod,
  getWorkingHoursForDate,
  checkBookingConflicts,
  checkBlockedSlotConflicts,
  generateSlots,
  groupSlotsByPeriod,
  type ExistingBooking,
  type BlockedSlot,
  type DaySchedule,
  type TimeRange,
} from "@/lib/booking/availability-checker";

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function makeBooking(
  time: string,
  durationMins: number,
  status = "confirmed"
): ExistingBooking {
  return {
    id:               `booking-${time}`,
    booking_time:     time,
    end_time:         addMinutes(time, durationMins),
    duration_minutes: durationMins,
    status,
  };
}

function makeBlock(start: string, end: string, reason = "Break"): BlockedSlot {
  return { id: `block-${start}`, start_time: start, end_time: end, reason };
}

// ─────────────────────────────────────────
// TIME UTILITIES
// ─────────────────────────────────────────
describe("timeToMinutes", () => {
  it("converts 00:00 to 0", () => expect(timeToMinutes("00:00")).toBe(0));
  it("converts 10:00 to 600", () => expect(timeToMinutes("10:00")).toBe(600));
  it("converts 18:30 to 1110", () => expect(timeToMinutes("18:30")).toBe(1110));
  it("converts 23:59 to 1439", () => expect(timeToMinutes("23:59")).toBe(1439));
});

describe("minutesToTime", () => {
  it("converts 0 to 00:00",   () => expect(minutesToTime(0)).toBe("00:00"));
  it("converts 600 to 10:00", () => expect(minutesToTime(600)).toBe("10:00"));
  it("converts 615 to 10:15", () => expect(minutesToTime(615)).toBe("10:15"));
  it("converts 1439 to 23:59", () => expect(minutesToTime(1439)).toBe("23:59"));
});

describe("formatTimeLabel", () => {
  it("converts 10:00 to 10:00 AM", () => expect(formatTimeLabel("10:00")).toBe("10:00 AM"));
  it("converts 13:30 to 1:30 PM",  () => expect(formatTimeLabel("13:30")).toBe("1:30 PM"));
  it("converts 00:00 to 12:00 AM", () => expect(formatTimeLabel("00:00")).toBe("12:00 AM"));
  it("converts 12:00 to 12:00 PM", () => expect(formatTimeLabel("12:00")).toBe("12:00 PM"));
});

describe("addMinutes", () => {
  it("adds 45 mins to 10:00 → 10:45", () => expect(addMinutes("10:00", 45)).toBe("10:45"));
  it("adds 60 mins to 11:00 → 12:00", () => expect(addMinutes("11:00", 60)).toBe("12:00"));
  it("adds 30 mins to 23:45 → 00:15", () => expect(addMinutes("23:45", 30)).toBe("00:15"));
});

describe("getPeriod", () => {
  it("08:00 → morning",   () => expect(getPeriod("08:00")).toBe("morning"));
  it("11:59 → morning",   () => expect(getPeriod("11:59")).toBe("morning"));
  it("12:00 → afternoon", () => expect(getPeriod("12:00")).toBe("afternoon"));
  it("16:59 → afternoon", () => expect(getPeriod("16:59")).toBe("afternoon"));
  it("17:00 → evening",   () => expect(getPeriod("17:00")).toBe("evening"));
  it("21:30 → evening",   () => expect(getPeriod("21:30")).toBe("evening"));
});

// ─────────────────────────────────────────
// WORKING HOURS
// ─────────────────────────────────────────
describe("getWorkingHoursForDate", () => {
  const schedule: DaySchedule = {
    monday:    { start: "10:00", end: "18:00" },
    tuesday:   { start: "10:00", end: "18:00" },
    wednesday: null,
    thursday:  { start: "11:00", end: "19:00" },
    friday:    { start: "09:00", end: "20:00" },
    saturday:  { start: "09:00", end: "18:00" },
    sunday:    null,
  };

  it("returns working hours for a working day", () => {
    // 2024-01-15 is a Monday
    const result = getWorkingHoursForDate(schedule, "2024-01-15");
    expect(result).toEqual({ start: "10:00", end: "18:00" });
  });

  it("returns null for a day off (Wednesday)", () => {
    // 2024-01-17 is a Wednesday
    const result = getWorkingHoursForDate(schedule, "2024-01-17");
    expect(result).toBeNull();
  });

  it("returns null for Sunday off", () => {
    // 2024-01-14 is a Sunday
    const result = getWorkingHoursForDate(schedule, "2024-01-14");
    expect(result).toBeNull();
  });

  it("returns different hours for Friday", () => {
    // 2024-01-19 is a Friday
    const result = getWorkingHoursForDate(schedule, "2024-01-19");
    expect(result).toEqual({ start: "09:00", end: "20:00" });
  });
});

// ─────────────────────────────────────────
// BOOKING CONFLICT CHECKS
// ─────────────────────────────────────────
describe("checkBookingConflicts", () => {
  const existingBooking = makeBooking("10:00", 60); // 10:00–11:00

  it("✅ allows slot that starts after existing ends", () => {
    const result = checkBookingConflicts("11:00", 60, [existingBooking]);
    expect(result.hasConflict).toBe(false);
  });

  it("✅ allows slot that ends before existing starts", () => {
    const result = checkBookingConflicts("09:00", 60, [existingBooking]);
    expect(result.hasConflict).toBe(false);
  });

  it("❌ rejects slot starting inside existing booking (Case A)", () => {
    // New: 10:30–11:30 overlaps with 10:00–11:00
    const result = checkBookingConflicts("10:30", 60, [existingBooking]);
    expect(result.hasConflict).toBe(true);
    expect(result.conflictReason).toContain("Overlaps");
  });

  it("❌ rejects slot ending inside existing booking (Case B)", () => {
    // New: 09:30–10:30 overlaps with 10:00–11:00
    const result = checkBookingConflicts("09:30", 60, [existingBooking]);
    expect(result.hasConflict).toBe(true);
  });

  it("❌ rejects slot that completely wraps existing booking (Case C)", () => {
    // New: 09:00–12:00 wraps 10:00–11:00
    const result = checkBookingConflicts("09:00", 180, [existingBooking]);
    expect(result.hasConflict).toBe(true);
  });

  it("❌ rejects exact same time slot", () => {
    const result = checkBookingConflicts("10:00", 60, [existingBooking]);
    expect(result.hasConflict).toBe(true);
  });

  it("✅ ignores cancelled bookings", () => {
    const cancelled = makeBooking("10:00", 60, "cancelled");
    const result    = checkBookingConflicts("10:00", 60, [cancelled]);
    expect(result.hasConflict).toBe(false);
  });

  it("✅ ignores no_show bookings", () => {
    const noShow = makeBooking("10:00", 60, "no_show");
    const result = checkBookingConflicts("10:00", 60, [noShow]);
    expect(result.hasConflict).toBe(false);
  });

  it("✅ no conflict with empty bookings list", () => {
    const result = checkBookingConflicts("10:00", 60, []);
    expect(result.hasConflict).toBe(false);
  });

  it("handles multiple bookings — only conflicts on overlap", () => {
    const bookings = [
      makeBooking("09:00", 60),  // 09:00–10:00
      makeBooking("11:00", 60),  // 11:00–12:00
    ];
    expect(checkBookingConflicts("10:00", 60, bookings).hasConflict).toBe(false); // 10:00–11:00 is free
    expect(checkBookingConflicts("10:30", 60, bookings).hasConflict).toBe(true);  // 10:30–11:30 overlaps second
  });
});

// ─────────────────────────────────────────
// BLOCKED SLOT CONFLICT CHECKS
// ─────────────────────────────────────────
describe("checkBlockedSlotConflicts", () => {
  const lunchBreak = makeBlock("13:00", "14:00", "Lunch break");

  it("✅ allows slot before break", () => {
    const result = checkBlockedSlotConflicts("12:00", 60, [lunchBreak]);
    expect(result.hasConflict).toBe(false);
  });

  it("✅ allows slot after break", () => {
    const result = checkBlockedSlotConflicts("14:00", 60, [lunchBreak]);
    expect(result.hasConflict).toBe(false);
  });

  it("❌ rejects slot during break", () => {
    const result = checkBlockedSlotConflicts("13:00", 30, [lunchBreak]);
    expect(result.hasConflict).toBe(true);
    expect(result.conflictReason).toContain("Blocked");
  });

  it("❌ rejects service that extends into break", () => {
    // 12:00 + 90min = 13:30 (inside break)
    const result = checkBlockedSlotConflicts("12:00", 90, [lunchBreak]);
    expect(result.hasConflict).toBe(true);
  });

  it("❌ rejects service starting before break but ending after", () => {
    // 12:30 + 60min = 13:30 (inside break)
    const result = checkBlockedSlotConflicts("12:30", 60, [lunchBreak]);
    expect(result.hasConflict).toBe(true);
  });
});

// ─────────────────────────────────────────
// GENERATE SLOTS
// ─────────────────────────────────────────
describe("generateSlots", () => {
  const workingHours: TimeRange = { start: "10:00", end: "18:00" };

  it("generates slots every 30 mins from 10:00 to 17:30 for 30-min service", () => {
    const slots = generateSlots(workingHours, 30, [], [], 30);
    expect(slots[0].time).toBe("10:00");
    expect(slots[slots.length - 1].time).toBe("17:30");
    // (18:00 - 10:00) / 30 = 16 slots
    expect(slots).toHaveLength(16);
  });

  it("all slots available when no bookings or blocks", () => {
    const slots = generateSlots(workingHours, 30, [], [], 30);
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it("marks slot as unavailable when booking conflicts", () => {
    const booking = makeBooking("10:00", 45);
    const slots   = generateSlots(workingHours, 30, [booking], [], 30);
    // 10:00 and 10:30 both overlap with 10:00–10:45
    const s1000 = slots.find((s) => s.time === "10:00");
    const s1030 = slots.find((s) => s.time === "10:30");
    const s1100 = slots.find((s) => s.time === "11:00");
    expect(s1000?.available).toBe(false);
    expect(s1030?.available).toBe(false);
    expect(s1100?.available).toBe(true);
  });

  it("❌ service extending past closing time is excluded", () => {
    // 17:45 + 30min = 18:15 > 18:00 close — slot should not be generated
    const slots = generateSlots(workingHours, 30, [], [], 15);
    const last  = slots[slots.length - 1];
    // last slot should be 17:30 (17:30 + 30 = 18:00 = close)
    expect(addMinutes(last.time, 30)).toBe(workingHours.end);
  });

  it("marks slot unavailable when it falls inside blocked slot", () => {
    const block = makeBlock("13:00", "14:00");
    const slots = generateSlots(workingHours, 30, [], [block], 30);
    const s1300 = slots.find((s) => s.time === "13:00");
    const s1330 = slots.find((s) => s.time === "13:30");
    const s1400 = slots.find((s) => s.time === "14:00");
    expect(s1300?.available).toBe(false);
    expect(s1330?.available).toBe(false);
    expect(s1400?.available).toBe(true);
  });

  it("excludes a booking by id (for reschedule)", () => {
    const booking = makeBooking("10:00", 60); // 10:00–11:00 booked
    const slots   = generateSlots(workingHours, 60, [booking], [], 30, booking.id);
    const s1000   = slots.find((s) => s.time === "10:00");
    // Should be available since we excluded the conflicting booking
    expect(s1000?.available).toBe(true);
  });

  it("handles 2h service correctly — fewer available slots", () => {
    const slots = generateSlots(workingHours, 120, [], [], 30);
    // Last valid slot: 16:00 (16:00 + 120 = 18:00)
    const times = slots.map((s) => s.time);
    expect(times).toContain("16:00");
    expect(times).not.toContain("16:30"); // 16:30 + 120 = 18:30 > 18:00
  });

  it("returns empty array when working hours window is shorter than service", () => {
    const tightHours: TimeRange = { start: "10:00", end: "10:30" };
    // 60-min service can't fit in 30-min window
    const slots = generateSlots(tightHours, 60, [], [], 30);
    expect(slots).toHaveLength(0);
  });
});

// ─────────────────────────────────────────
// RACE CONDITION SIMULATION
// Two users booking the same slot "simultaneously"
// ─────────────────────────────────────────
describe("Race condition: same-slot concurrent booking", () => {
  it("second booking conflicts after first is inserted", () => {
    const firstBooking = makeBooking("14:00", 60);

    // First user: no bookings yet → available
    const before = checkBookingConflicts("14:00", 60, []);
    expect(before.hasConflict).toBe(false);

    // First user saves the booking (now in DB)
    // Second user: booking now exists → conflict
    const after = checkBookingConflicts("14:00", 60, [firstBooking]);
    expect(after.hasConflict).toBe(true);
  });
});

// ─────────────────────────────────────────
// GROUP SLOTS BY PERIOD
// ─────────────────────────────────────────
describe("groupSlotsByPeriod", () => {
  const workingHours: TimeRange = { start: "08:00", end: "22:00" };
  const slots = generateSlots(workingHours, 30, [], [], 60);

  it("groups morning slots (before 12:00)", () => {
    const grouped = groupSlotsByPeriod(slots);
    expect(grouped.morning.every((s) => timeToMinutes(s.time) < 12 * 60)).toBe(true);
  });

  it("groups afternoon slots (12:00–16:59)", () => {
    const grouped = groupSlotsByPeriod(slots);
    expect(
      grouped.afternoon.every((s) => {
        const m = timeToMinutes(s.time);
        return m >= 12 * 60 && m < 17 * 60;
      })
    ).toBe(true);
  });

  it("groups evening slots (17:00+)", () => {
    const grouped = groupSlotsByPeriod(slots);
    expect(grouped.evening.every((s) => timeToMinutes(s.time) >= 17 * 60)).toBe(true);
  });
});
