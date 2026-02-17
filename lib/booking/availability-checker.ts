// ============================================================
// BookFlow — Availability Checker
// lib/booking/availability-checker.ts
// ============================================================
// Core engine for availability logic. No HTTP, no Next.js —
// pure functions that take data and return results.
// This makes them fully unit-testable in isolation.
// ============================================================

import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export interface TimeRange {
  start: string; // "HH:MM" 24-hour
  end:   string;
}

export interface DaySchedule {
  [day: string]: TimeRange | null; // null = day off
}

export interface ExistingBooking {
  id:               string;
  booking_time:     string; // "HH:MM"
  end_time:         string; // "HH:MM" (computed column)
  duration_minutes: number;
  status:           string;
}

export interface BlockedSlot {
  id:         string;
  start_time: string; // "HH:MM"
  end_time:   string;
  reason?:    string;
}

export interface TimeSlot {
  time:      string;  // "HH:MM"
  available: boolean;
  label:     string;  // "10:00 AM"
}

export interface SlotsByPeriod {
  morning:   TimeSlot[]; // 06:00 – 11:59
  afternoon: TimeSlot[]; // 12:00 – 16:59
  evening:   TimeSlot[]; // 17:00 – 22:00
}

export interface AvailabilityResult {
  date:          string;
  staffId:       string;
  serviceId:     string;
  durationMins:  number;
  slots:         SlotsByPeriod;
  totalAvailable: number;
  workingHours:  TimeRange | null;
}

export interface ConflictResult {
  hasConflict:    boolean;
  conflictReason: string | null;
  conflictingId?: string;
}

// ─────────────────────────────────────────
// TIME UTILITIES (pure, no side-effects)
// ─────────────────────────────────────────

/** Convert "HH:MM" to total minutes since midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Convert minutes since midnight to "HH:MM" */
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Convert "HH:MM" to "10:00 AM" / "2:30 PM" */
export function formatTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/** Get lowercase day name for a date string (YYYY-MM-DD) */
export function getDayName(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
}

/** True if timeA < timeB (both "HH:MM") */
export function timeBefore(a: string, b: string): boolean {
  return timeToMinutes(a) < timeToMinutes(b);
}

/** Add `mins` minutes to a "HH:MM" string */
export function addMinutes(time: string, mins: number): string {
  return minutesToTime(timeToMinutes(time) + mins);
}

/** Period classifier for grouping slots */
export function getPeriod(time: string): "morning" | "afternoon" | "evening" {
  const m = timeToMinutes(time);
  if (m < 12 * 60) return "morning";
  if (m < 17 * 60) return "afternoon";
  return "evening";
}

// ─────────────────────────────────────────
// PURE AVAILABILITY LOGIC
// These functions take data (not DB) so they
// are 100% unit-testable.
// ─────────────────────────────────────────

/**
 * Get working hours for a given date from a staff's JSONB schedule.
 * Returns null if the staff is off that day.
 */
export function getWorkingHoursForDate(
  workingHours: DaySchedule,
  date: string
): TimeRange | null {
  const dayName = getDayName(date);
  return workingHours[dayName] ?? null;
}

/**
 * Check if a proposed slot [startTime, startTime + durationMins)
 * conflicts with ANY existing booking.
 *
 * Three overlap cases:
 *   A: new booking starts during existing
 *   B: new booking ends during existing
 *   C: new booking wraps an existing booking
 */
export function checkBookingConflicts(
  startTime:    string,
  durationMins: number,
  bookings:     ExistingBooking[]
): ConflictResult {
  const newStart = timeToMinutes(startTime);
  const newEnd   = newStart + durationMins;

  for (const b of bookings) {
    if (!["pending", "confirmed"].includes(b.status)) continue;

    const exStart = timeToMinutes(b.booking_time);
    const exEnd   = timeToMinutes(b.end_time);

    const overlaps =
      (newStart >= exStart && newStart < exEnd) || // A
      (newEnd > exStart   && newEnd <= exEnd)    || // B
      (newStart <= exStart && newEnd >= exEnd);     // C

    if (overlaps) {
      return {
        hasConflict:    true,
        conflictReason: `Overlaps with existing booking at ${b.booking_time}`,
        conflictingId:  b.id,
      };
    }
  }
  return { hasConflict: false, conflictReason: null };
}

/**
 * Check if a proposed slot conflicts with ANY blocked slot.
 */
export function checkBlockedSlotConflicts(
  startTime:    string,
  durationMins: number,
  blockedSlots: BlockedSlot[]
): ConflictResult {
  const newStart = timeToMinutes(startTime);
  const newEnd   = newStart + durationMins;

  for (const b of blockedSlots) {
    const bStart = timeToMinutes(b.start_time);
    const bEnd   = timeToMinutes(b.end_time);

    const overlaps =
      (newStart >= bStart && newStart < bEnd) ||
      (newEnd > bStart   && newEnd <= bEnd)   ||
      (newStart <= bStart && newEnd >= bEnd);

    if (overlaps) {
      return {
        hasConflict:    true,
        conflictReason: `Blocked: ${b.reason ?? "staff unavailable"} (${b.start_time}–${b.end_time})`,
        conflictingId:  b.id,
      };
    }
  }
  return { hasConflict: false, conflictReason: null };
}

/**
 * Generate all candidate time slots for a given working-hours range,
 * then mark each as available or unavailable.
 *
 * @param workingHours  The staff's working hours for that day
 * @param durationMins  Duration of the service
 * @param bookings      Existing bookings on that day (pending/confirmed)
 * @param blockedSlots  Staff blocks on that day
 * @param slotInterval  Minutes between slot options (default 30)
 * @param excludeBookingId  Skip one booking (used when rescheduling)
 */
export function generateSlots(
  workingHours:  TimeRange,
  durationMins:  number,
  bookings:      ExistingBooking[],
  blockedSlots:  BlockedSlot[],
  slotInterval   = 30,
  excludeBookingId?: string
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  const workStart = timeToMinutes(workingHours.start);
  const workEnd   = timeToMinutes(workingHours.end);

  // Filter out excluded booking (for reschedule flow)
  const activeBookings = excludeBookingId
    ? bookings.filter((b) => b.id !== excludeBookingId)
    : bookings;

  let cursor = workStart;

  while (cursor + durationMins <= workEnd) {
    const time    = minutesToTime(cursor);
    const endTime = minutesToTime(cursor + durationMins);

    // Check both conflict types
    const bookingConflict = checkBookingConflicts(time, durationMins, activeBookings);
    const blockConflict   = checkBlockedSlotConflicts(time, durationMins, blockedSlots);

    slots.push({
      time,
      label:     formatTimeLabel(time),
      available: !bookingConflict.hasConflict && !blockConflict.hasConflict,
    });

    cursor += slotInterval;
  }

  return slots;
}

/**
 * Group a flat slot list into morning / afternoon / evening buckets.
 */
export function groupSlotsByPeriod(slots: TimeSlot[]): SlotsByPeriod {
  return {
    morning:   slots.filter((s) => getPeriod(s.time) === "morning"),
    afternoon: slots.filter((s) => getPeriod(s.time) === "afternoon"),
    evening:   slots.filter((s) => getPeriod(s.time) === "evening"),
  };
}

// ─────────────────────────────────────────
// DATABASE-BACKED FUNCTIONS
// ─────────────────────────────────────────

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Fetch a staff member's working_hours JSONB from the DB.
 */
export async function getStaffWorkingHours(
  staffId: string
): Promise<DaySchedule> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("staff")
    .select("working_hours")
    .eq("id", staffId)
    .single();

  if (error || !data) {
    throw new Error(`Staff ${staffId} not found: ${error?.message}`);
  }
  return (data.working_hours ?? {}) as DaySchedule;
}

/**
 * Fetch all active (pending/confirmed) bookings for a staff member
 * on a specific date.
 */
export async function getStaffBookingsOnDate(
  staffId: string,
  date:    string
): Promise<ExistingBooking[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, booking_time, end_time, duration_minutes, status")
    .eq("staff_id", staffId)
    .eq("booking_date", date)
    .in("status", ["pending", "confirmed"]);

  if (error) throw new Error(`Failed to fetch bookings: ${error.message}`);
  return (data ?? []) as ExistingBooking[];
}

/**
 * Fetch all blocked slots for a staff member on a specific date.
 */
export async function getBlockedSlotsOnDate(
  staffId: string,
  date:    string
): Promise<BlockedSlot[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("blocked_slots")
    .select("id, start_time, end_time, reason")
    .eq("staff_id", staffId)
    .eq("slot_date", date);

  if (error) throw new Error(`Failed to fetch blocked slots: ${error.message}`);
  return (data ?? []) as BlockedSlot[];
}

/**
 * Fetch service duration from DB.
 */
export async function getServiceDuration(serviceId: string): Promise<number> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .single();

  if (error || !data) throw new Error(`Service ${serviceId} not found`);
  return data.duration_minutes as number;
}

/**
 * Get all active staff for a business.
 * Used when customer selects "Any Available".
 */
export async function getActiveStaff(
  businessId: string
): Promise<{ id: string; name: string; role_name: string }[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("staff")
    .select("id, users(name), role_name")
    .eq("business_id", businessId)
    .eq("is_active", true);

  if (error) throw new Error(`Failed to fetch staff: ${error.message}`);
  return (data ?? []).map((s: any) => ({
    id:        s.id,
    name:      s.users?.name ?? "Staff",
    role_name: s.role_name,
  }));
}

// ─────────────────────────────────────────
// MAIN PUBLIC API
// ─────────────────────────────────────────

/**
 * isSlotAvailable — lightweight point-in-time check.
 * Used as a final double-check before booking creation.
 * Returns a ConflictResult so the caller knows WHY it's blocked.
 */
export async function isSlotAvailable(
  staffId:          string,
  date:             string,
  startTime:        string,
  durationMins:     number,
  excludeBookingId?: string
): Promise<ConflictResult> {
  // 0. Reject past slots when date is today
  const today = new Date().toISOString().split("T")[0];
  if (date === today) {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = startTime.split(":").map(Number);
    const slotMins = sh * 60 + sm;
    if (slotMins <= nowMins) {
      return { hasConflict: true, conflictReason: "This time slot has already passed" };
    }
  }

  // 1. Working hours
  const schedule     = await getStaffWorkingHours(staffId);
  const workingHours = getWorkingHoursForDate(schedule, date);

  if (!workingHours) {
    return { hasConflict: true, conflictReason: "Staff is not working on this day" };
  }

  const slotEnd  = addMinutes(startTime, durationMins);
  const workEnd  = workingHours.end;
  const workStart = workingHours.start;

  if (timeBefore(startTime, workStart)) {
    return { hasConflict: true, conflictReason: "Slot is before working hours start" };
  }
  if (!timeBefore(slotEnd, workEnd) && slotEnd !== workEnd) {
    // slotEnd > workEnd means the service extends past closing
    if (timeToMinutes(slotEnd) > timeToMinutes(workEnd)) {
      return { hasConflict: true, conflictReason: "Service extends past closing time" };
    }
  }

  // 2. Existing bookings
  const bookings = await getStaffBookingsOnDate(staffId, date);
  const activeBookings = excludeBookingId
    ? bookings.filter((b) => b.id !== excludeBookingId)
    : bookings;

  const bookingConflict = checkBookingConflicts(startTime, durationMins, activeBookings);
  if (bookingConflict.hasConflict) return bookingConflict;

  // 3. Blocked slots
  const blocked      = await getBlockedSlotsOnDate(staffId, date);
  const blockConflict = checkBlockedSlotConflicts(startTime, durationMins, blocked);
  if (blockConflict.hasConflict) return blockConflict;

  return { hasConflict: false, conflictReason: null };
}

/**
 * getAvailableSlots — full slot generation for the date-picker UI.
 * Returns slots grouped by morning/afternoon/evening.
 */
export async function getAvailableSlots(
  businessId:  string,
  serviceId:   string,
  staffId:     string | "any",
  date:        string,
  slotInterval = 30
): Promise<AvailabilityResult[]> {
  // Resolve "any" → all active staff
  const staffIds: string[] =
    staffId === "any"
      ? (await getActiveStaff(businessId)).map((s) => s.id)
      : [staffId];

  const durationMins = await getServiceDuration(serviceId);
  const results: AvailabilityResult[] = [];

  for (const sid of staffIds) {
    const schedule     = await getStaffWorkingHours(sid);
    const workingHours = getWorkingHoursForDate(schedule, date);

    if (!workingHours) {
      results.push({
        date,
        staffId:       sid,
        serviceId,
        durationMins,
        slots:         { morning: [], afternoon: [], evening: [] },
        totalAvailable: 0,
        workingHours:  null,
      });
      continue;
    }

    const [bookings, blockedSlots] = await Promise.all([
      getStaffBookingsOnDate(sid, date),
      getBlockedSlotsOnDate(sid, date),
    ]);

    const flatSlots = generateSlots(
      workingHours,
      durationMins,
      bookings,
      blockedSlots,
      slotInterval
    );

    const grouped       = groupSlotsByPeriod(flatSlots);
    const totalAvailable = flatSlots.filter((s) => s.available).length;

    results.push({
      date,
      staffId:       sid,
      serviceId,
      durationMins,
      slots:         grouped,
      totalAvailable,
      workingHours,
    });
  }

  return results;
}

/**
 * checkForConflicts — convenience wrapper used by the create-booking API
 * to do a targeted conflict check without generating full slot lists.
 */
export async function checkForConflicts(
  staffId:      string,
  date:         string,
  startTime:    string,
  endTime:      string
): Promise<ConflictResult> {
  const startMins = timeToMinutes(startTime);
  const endMins   = timeToMinutes(endTime);
  const duration  = endMins - startMins;
  return isSlotAvailable(staffId, date, startTime, duration);
}
