-- ============================================================
-- Migration: Add WhatsApp Session State Management
-- 007_add_whatsapp_session_state.sql
-- ============================================================
-- Adds session state tracking for WhatsApp conversations
-- and waitlist functionality for automatic slot filling
-- ============================================================

-- Add session state column to bookings table
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS whatsapp_session_state TEXT;

-- Create index for faster lookups by phone + state
CREATE INDEX IF NOT EXISTS idx_bookings_whatsapp_state 
  ON bookings(business_id, whatsapp_session_state) 
  WHERE whatsapp_session_state IS NOT NULL;

-- ============================================================
-- WAITLIST TABLE
-- ============================================================
-- Stores customers waiting for specific slots to open up
CREATE TABLE IF NOT EXISTS waitlist (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id       UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  staff_id         UUID REFERENCES staff(id) ON DELETE SET NULL,
  preferred_date   DATE,
  preferred_time   TIME,
  preferred_days   TEXT[], -- e.g., ['monday', 'wednesday', 'friday']
  preferred_times  TEXT[], -- e.g., ['morning', 'afternoon']
  status           TEXT NOT NULL DEFAULT 'active', -- 'active', 'notified', 'fulfilled', 'cancelled'
  notified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_business 
  ON waitlist(business_id, status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_waitlist_service_staff 
  ON waitlist(service_id, staff_id, status) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_waitlist_date_time 
  ON waitlist(preferred_date, preferred_time, status) 
  WHERE status = 'active' AND preferred_date IS NOT NULL;

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON COLUMN bookings.whatsapp_session_state IS 
  'Tracks WhatsApp conversation state: awaiting_confirmation, awaiting_slot_selection, rescheduled';

COMMENT ON TABLE waitlist IS 
  'Customers waiting for slots to open up. Auto-notified when matching slots become available.';
