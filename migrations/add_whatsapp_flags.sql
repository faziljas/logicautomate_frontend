-- ============================================================
-- Migration: add_whatsapp_flags
-- Adds WhatsApp notification tracking columns to bookings table
-- and delivery tracking columns to whatsapp_logs table.
-- Run after: 001_initial_schema.sql
-- ============================================================

-- ── Booking-level notification flags ──────────────────────────
-- These are SET in 001_initial_schema.sql but included here
-- as a standalone migration for projects that already have the
-- base schema deployed without them.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_24h_sent  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS no_show_sent       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS feedback_sent      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS loyalty_sent       BOOLEAN NOT NULL DEFAULT FALSE;

-- Index: cron job queries for unsent reminders for confirmed future bookings
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_24h
  ON bookings(business_id, booking_date, reminder_24h_sent)
  WHERE status = 'confirmed' AND reminder_24h_sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_bookings_reminder_2h
  ON bookings(business_id, booking_date, booking_time, reminder_2h_sent)
  WHERE status = 'confirmed' AND reminder_2h_sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_bookings_feedback_pending
  ON bookings(business_id, booking_date, feedback_sent)
  WHERE status = 'completed' AND feedback_sent = FALSE;

-- ── WhatsApp log delivery tracking ────────────────────────────
-- Store Twilio message SID and delivery timestamps for status
-- webhook updates (sent → delivered → read / failed / undelivered).

ALTER TABLE whatsapp_logs
  ADD COLUMN IF NOT EXISTS twilio_message_sid  TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_code          TEXT,
  ADD COLUMN IF NOT EXISTS error_message       TEXT;

-- Unique index on SID for fast webhook lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_logs_twilio_sid
  ON whatsapp_logs(twilio_message_sid)
  WHERE twilio_message_sid IS NOT NULL;

-- Index for status filtering in logs UI
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status
  ON whatsapp_logs(business_id, status, sent_at DESC);

-- ── Update whatsapp_logs.status enum if needed ─────────────────
-- Original enum: sent | delivered | failed | pending
-- We add 'read' and 'undelivered' to match Twilio's status values.

DO $$
BEGIN
  -- Add 'read' if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'whatsapp_status'::regtype
      AND enumlabel = 'read'
  ) THEN
    ALTER TYPE whatsapp_status ADD VALUE IF NOT EXISTS 'read';
  END IF;

  -- Add 'undelivered' if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'whatsapp_status'::regtype
      AND enumlabel = 'undelivered'
  ) THEN
    ALTER TYPE whatsapp_status ADD VALUE IF NOT EXISTS 'undelivered';
  END IF;
END $$;
