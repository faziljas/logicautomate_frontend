-- ============================================================
-- BookFlow — Booking Helper Functions & Constraints
-- migrations/003_booking_helpers.sql
-- ============================================================

-- ─────────────────────────────────────────
-- 1. booking_expires_at column
--    Holds the timestamp after which a
--    'pending' booking auto-cancels.
-- ─────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_expires_at TIMESTAMPTZ;

-- Index for the cleanup cron job
CREATE INDEX IF NOT EXISTS idx_bookings_expires_at
  ON bookings(booking_expires_at)
  WHERE status = 'pending';

-- ─────────────────────────────────────────
-- 2. UNIQUE partial index
--    One pending/confirmed booking per
--    staff + date + time slot.
--    This is the DB-level race condition guard.
-- ─────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_no_double_book
  ON bookings(staff_id, booking_date, booking_time)
  WHERE status IN ('pending', 'confirmed');

-- ─────────────────────────────────────────
-- 3. create_booking_atomic RPC
--    Called from the API with advisory lock
--    to prevent concurrent inserts for the
--    same staff/date/time slot.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_business_id    UUID,
  p_customer_id    UUID,
  p_service_id     UUID,
  p_staff_id       UUID,
  p_booking_date   DATE,
  p_booking_time   TIME,
  p_duration_mins  INTEGER,
  p_total_amount   NUMERIC,
  p_advance_amount NUMERIC,
  p_custom_data    JSONB    DEFAULT '{}',
  p_expires_at     TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_end_time   TIME;
  v_conflict_count INTEGER;
  v_new_id         UUID;
  v_lock_key       BIGINT;
BEGIN
  -- Advisory lock: hash of staff_id + date + time (prevents concurrent inserts)
  v_lock_key := hashtext(p_staff_id::TEXT || p_booking_date::TEXT || p_booking_time::TEXT);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  v_new_end_time := p_booking_time + (p_duration_mins || ' minutes')::INTERVAL;

  -- Re-check availability inside the transaction
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings
  WHERE staff_id    = p_staff_id
    AND booking_date = p_booking_date
    AND status      IN ('pending', 'confirmed')
    AND (
      (p_booking_time >= booking_time AND p_booking_time < end_time) OR
      (v_new_end_time > booking_time  AND v_new_end_time <= end_time) OR
      (p_booking_time <= booking_time AND v_new_end_time >= end_time)
    );

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'slot_already_taken'
      USING DETAIL = 'Staff slot is no longer available';
  END IF;

  -- Check blocked slots
  SELECT COUNT(*) INTO v_conflict_count
  FROM blocked_slots
  WHERE staff_id  = p_staff_id
    AND slot_date = p_booking_date
    AND (
      (p_booking_time >= start_time AND p_booking_time < end_time) OR
      (v_new_end_time > start_time  AND v_new_end_time <= end_time) OR
      (p_booking_time <= start_time AND v_new_end_time >= end_time)
    );

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'slot_already_taken'
      USING DETAIL = 'Slot falls within a blocked period';
  END IF;

  -- Safe to insert
  INSERT INTO bookings (
    business_id, customer_id, service_id, staff_id,
    booking_date, booking_time, duration_minutes,
    status, total_amount, advance_paid,
    custom_data, booking_expires_at
  )
  VALUES (
    p_business_id, p_customer_id, p_service_id, p_staff_id,
    p_booking_date, p_booking_time, p_duration_mins,
    'pending', p_total_amount, 0,
    p_custom_data,
    COALESCE(p_expires_at, NOW() + INTERVAL '15 minutes')
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- ─────────────────────────────────────────
-- 4. cancel_expired_bookings function
--    Called by cron every minute.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION cancel_expired_bookings()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE bookings
  SET
    status               = 'cancelled',
    cancellation_reason  = 'Payment not completed within 15 minutes'
  WHERE status              = 'pending'
    AND booking_expires_at  IS NOT NULL
    AND booking_expires_at  < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────
-- 5. pg_cron schedule (if pg_cron extension
--    is enabled on Supabase Pro)
-- ─────────────────────────────────────────
-- SELECT cron.schedule(
--   'cancel-expired-bookings',
--   '* * * * *',  -- every minute
--   'SELECT cancel_expired_bookings()'
-- );
