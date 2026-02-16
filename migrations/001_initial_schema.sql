-- ============================================================
-- BookFlow: Initial Schema Migration
-- 001_initial_schema.sql
-- ============================================================

-- ─────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fast text search

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────
CREATE TYPE industry_type AS ENUM (
  'salon',
  'clinic',
  'coaching',
  'consulting',
  'photography',
  'fitness',
  'custom'
);

CREATE TYPE subscription_tier AS ENUM (
  'trial',
  'starter',
  'professional',
  'business'
);

CREATE TYPE subscription_status AS ENUM (
  'active',
  'cancelled',
  'expired',
  'trial'
);

CREATE TYPE user_role AS ENUM (
  'owner',
  'staff',
  'customer'
);

CREATE TYPE booking_status AS ENUM (
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show'
);

CREATE TYPE payment_method AS ENUM (
  'razorpay',
  'cash',
  'upi',
  'card'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'refunded'
);

CREATE TYPE whatsapp_message_type AS ENUM (
  'confirmation',
  'reminder_24h',
  'reminder_2h',
  'no_show_followup',
  'feedback',
  'marketing',
  'loyalty_reward'
);

CREATE TYPE whatsapp_status AS ENUM (
  'sent',
  'delivered',
  'read',
  'failed'
);

-- ─────────────────────────────────────────
-- TABLE: templates
-- Stores industry-specific default configs.
-- Seeded once; businesses copy from here.
-- ─────────────────────────────────────────
CREATE TABLE templates (
  id            TEXT PRIMARY KEY,           -- 'salon', 'clinic', 'coaching'
  name          TEXT NOT NULL,              -- 'Salon & Spa'
  description   TEXT,
  config        JSONB NOT NULL DEFAULT '{}',-- Full template definition
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE: businesses
-- One row per tenant. All other tables
-- reference business_id for isolation.
-- ─────────────────────────────────────────
CREATE TABLE businesses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  slug                TEXT UNIQUE NOT NULL,        -- URL identifier: 'salon-bliss'
  industry_type       industry_type NOT NULL,
  template_id         TEXT REFERENCES templates(id),
  custom_config       JSONB NOT NULL DEFAULT '{}', -- Copied + customised from template
  owner_id            UUID,                        -- FK to users (set after user creation)
  phone               TEXT,
  email               TEXT,
  address             TEXT,
  city                TEXT,
  logo_url            TEXT,
  booking_url         TEXT,                        -- Full public URL
  whatsapp_number     TEXT,
  google_review_link  TEXT,
  subscription_tier   subscription_tier NOT NULL DEFAULT 'trial',
  subscription_status subscription_status NOT NULL DEFAULT 'trial',
  subscription_ends_at TIMESTAMPTZ,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  metadata            JSONB NOT NULL DEFAULT '{}', -- Extra settings
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE: users
-- Covers owners, staff, and customers.
-- Role distinguishes behaviour.
-- ─────────────────────────────────────────
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT UNIQUE,
  phone       TEXT,
  name        TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'customer',
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  avatar_url  TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}', -- Role-specific data
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_or_phone CHECK (
    email IS NOT NULL OR phone IS NOT NULL
  )
);

-- Back-fill FK on businesses after users table exists
ALTER TABLE businesses
  ADD CONSTRAINT businesses_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id);

-- ─────────────────────────────────────────
-- TABLE: services
-- Offered by a business. Duration / price
-- are fixed columns; extra fields go in
-- custom_fields JSONB.
-- ─────────────────────────────────────────
CREATE TABLE services (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  price            NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  advance_amount   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (advance_amount >= 0),
  category         TEXT,                   -- 'Hair', 'Skin', 'Nail', etc.
  custom_fields    JSONB NOT NULL DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  display_order    INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE: staff
-- Staff members linked to a business.
-- working_hours is a JSONB schedule object.
-- ─────────────────────────────────────────
CREATE TABLE staff (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_name        TEXT NOT NULL DEFAULT 'Staff', -- 'Stylist', 'Doctor', 'Tutor'
  specializations  JSONB NOT NULL DEFAULT '[]',   -- ["Haircut", "Coloring"]
  working_hours    JSONB NOT NULL DEFAULT '{}',
  -- Format: {"monday":{"start":"10:00","end":"18:00"},"tuesday":{...}}
  -- Null day = day off
  bio              TEXT,
  rating           NUMERIC(3,2) DEFAULT 0.00,
  total_reviews    INTEGER NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (business_id, user_id)
);

-- ─────────────────────────────────────────
-- TABLE: blocked_slots
-- Staff unavailability: breaks, holidays,
-- manual blocks.
-- ─────────────────────────────────────────
CREATE TABLE blocked_slots (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  slot_date   DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT blocked_slots_time_check CHECK (end_time > start_time)
);

-- ─────────────────────────────────────────
-- TABLE: customers
-- Per-business customer records.
-- custom_fields stores industry data.
-- ─────────────────────────────────────────
CREATE TABLE customers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
  email          TEXT,
  total_visits   INTEGER NOT NULL DEFAULT 0,
  total_spent    NUMERIC(12,2) NOT NULL DEFAULT 0,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  notes          TEXT,
  custom_fields  JSONB NOT NULL DEFAULT '{}',
  -- Salon:   {"hair_type":"curly","allergies":"none"}
  -- Clinic:  {"blood_group":"O+","chronic_conditions":[]}
  -- Coaching:{"grade":"10th","subjects":["Math"]}
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (business_id, phone)
);

-- ─────────────────────────────────────────
-- TABLE: bookings
-- Core transactional table.
-- custom_data captures per-booking details.
-- ─────────────────────────────────────────
CREATE TABLE bookings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  service_id       UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  staff_id         UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  booking_date     DATE NOT NULL,
  booking_time     TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  end_time         TIME GENERATED ALWAYS AS (
                     (booking_time + (duration_minutes || ' minutes')::INTERVAL)::TIME
                   ) STORED,
  status           booking_status NOT NULL DEFAULT 'pending',
  total_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  advance_paid     NUMERIC(10,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(10,2) GENERATED ALWAYS AS (total_amount - advance_paid) STORED,
  special_requests TEXT,
  cancellation_reason TEXT,
  custom_data      JSONB NOT NULL DEFAULT '{}',
  -- Salon:   {"preferred_products":"L'Oreal","color_formula":"..."}
  -- Clinic:  {"symptoms":"headache","referral_doctor":"Dr X"}
  -- Coaching:{"homework_status":"done","topics_covered":["algebra"]}
  reminder_24h_sent BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_2h_sent  BOOLEAN NOT NULL DEFAULT FALSE,
  feedback_sent     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE: payments
-- Linked 1-to-1 with a booking (advance).
-- Additional payments possible (remaining).
-- ─────────────────────────────────────────
CREATE TABLE payments (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id           UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  business_id          UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  amount               NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method       payment_method NOT NULL DEFAULT 'razorpay',
  razorpay_order_id    TEXT,
  razorpay_payment_id  TEXT,
  razorpay_signature   TEXT,
  status               payment_status NOT NULL DEFAULT 'pending',
  is_advance           BOOLEAN NOT NULL DEFAULT TRUE,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE: whatsapp_logs
-- Every outgoing WhatsApp message recorded.
-- ─────────────────────────────────────────
CREATE TABLE whatsapp_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  booking_id     UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_phone TEXT NOT NULL,
  message_type   whatsapp_message_type NOT NULL,
  template_used  TEXT,
  message_body   TEXT NOT NULL,
  status         whatsapp_status NOT NULL DEFAULT 'sent',
  provider_id    TEXT,  -- Twilio SID or provider message ID
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at   TIMESTAMPTZ,
  read_at        TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- INDEXES — performance
-- ─────────────────────────────────────────

-- businesses
CREATE INDEX idx_businesses_slug         ON businesses(slug);
CREATE INDEX idx_businesses_owner_id     ON businesses(owner_id);
CREATE INDEX idx_businesses_industry     ON businesses(industry_type);

-- users
CREATE INDEX idx_users_business_id       ON users(business_id);
CREATE INDEX idx_users_email             ON users(email);
CREATE INDEX idx_users_phone             ON users(phone);
CREATE INDEX idx_users_role              ON users(role);

-- services
CREATE INDEX idx_services_business_id   ON services(business_id);
CREATE INDEX idx_services_is_active     ON services(business_id, is_active);

-- staff
CREATE INDEX idx_staff_business_id      ON staff(business_id);
CREATE INDEX idx_staff_user_id          ON staff(user_id);
CREATE INDEX idx_staff_is_active        ON staff(business_id, is_active);

-- customers
CREATE INDEX idx_customers_business_id  ON customers(business_id);
CREATE INDEX idx_customers_phone        ON customers(business_id, phone);
CREATE INDEX idx_customers_user_id      ON customers(user_id);
-- Full-text search on customer name
CREATE INDEX idx_customers_name_trgm    ON customers USING GIN (name gin_trgm_ops);

-- bookings
CREATE INDEX idx_bookings_business_id   ON bookings(business_id);
CREATE INDEX idx_bookings_customer_id   ON bookings(customer_id);
CREATE INDEX idx_bookings_staff_id      ON bookings(staff_id);
CREATE INDEX idx_bookings_service_id    ON bookings(service_id);
CREATE INDEX idx_bookings_date          ON bookings(business_id, booking_date);
CREATE INDEX idx_bookings_status        ON bookings(business_id, status);
-- Critical: availability check (staff + date + status)
CREATE INDEX idx_bookings_availability  ON bookings(staff_id, booking_date, status)
  WHERE status IN ('pending', 'confirmed');
-- Reminder jobs
CREATE INDEX idx_bookings_reminders     ON bookings(booking_date, status, reminder_24h_sent, reminder_2h_sent)
  WHERE status = 'confirmed';

-- payments
CREATE INDEX idx_payments_booking_id      ON payments(booking_id);
CREATE INDEX idx_payments_business_id     ON payments(business_id);
CREATE INDEX idx_payments_razorpay_order  ON payments(razorpay_order_id);
CREATE INDEX idx_payments_status          ON payments(business_id, status);

-- whatsapp_logs
CREATE INDEX idx_whatsapp_business_id   ON whatsapp_logs(business_id);
CREATE INDEX idx_whatsapp_booking_id    ON whatsapp_logs(booking_id);
CREATE INDEX idx_whatsapp_sent_at       ON whatsapp_logs(sent_at);

-- blocked_slots
CREATE INDEX idx_blocked_staff_date     ON blocked_slots(staff_id, slot_date);

-- ─────────────────────────────────────────
-- AUTO-UPDATE updated_at via trigger
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_businesses_updated_at   BEFORE UPDATE ON businesses   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at        BEFORE UPDATE ON users        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_services_updated_at     BEFORE UPDATE ON services     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_staff_updated_at        BEFORE UPDATE ON staff        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated_at    BEFORE UPDATE ON customers    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated_at     BEFORE UPDATE ON bookings     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated_at     BEFORE UPDATE ON payments     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_templates_updated_at    BEFORE UPDATE ON templates    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- FUNCTION: check_booking_availability
-- Returns TRUE if the slot is free for
-- the given staff / date / time / duration.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_booking_availability(
  p_staff_id       UUID,
  p_booking_date   DATE,
  p_booking_time   TIME,
  p_duration_mins  INTEGER,
  p_exclude_booking_id UUID DEFAULT NULL  -- used when rescheduling
)
RETURNS BOOLEAN AS $$
DECLARE
  v_end_time TIME;
  v_conflict INTEGER;
  v_blocked  INTEGER;
BEGIN
  v_end_time := p_booking_time + (p_duration_mins || ' minutes')::INTERVAL;

  -- Check existing bookings overlap
  SELECT COUNT(*) INTO v_conflict
  FROM bookings
  WHERE staff_id    = p_staff_id
    AND booking_date = p_booking_date
    AND status IN ('pending', 'confirmed')
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
    AND (
      -- new booking starts inside an existing booking
      (p_booking_time >= booking_time AND p_booking_time < end_time)
      OR
      -- new booking ends inside an existing booking
      (v_end_time > booking_time AND v_end_time <= end_time)
      OR
      -- new booking wraps an existing booking
      (p_booking_time <= booking_time AND v_end_time >= end_time)
    );

  IF v_conflict > 0 THEN
    RETURN FALSE;
  END IF;

  -- Check blocked slots overlap
  SELECT COUNT(*) INTO v_blocked
  FROM blocked_slots
  WHERE staff_id  = p_staff_id
    AND slot_date = p_booking_date
    AND (
      (p_booking_time >= start_time AND p_booking_time < end_time)
      OR
      (v_end_time > start_time AND v_end_time <= end_time)
      OR
      (p_booking_time <= start_time AND v_end_time >= end_time)
    );

  IF v_blocked > 0 THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────
-- FUNCTION: increment_customer_stats
-- Called after a booking is marked complete.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- When a booking transitions to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE customers
    SET
      total_visits = total_visits + 1,
      total_spent  = total_spent + NEW.total_amount
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_complete
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION increment_customer_stats();

-- ─────────────────────────────────────────
-- FUNCTION: get_available_slots
-- Returns available TIME slots for a staff
-- member on a given date.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_available_slots(
  p_staff_id      UUID,
  p_date          DATE,
  p_duration_mins INTEGER,
  p_slot_interval INTEGER DEFAULT 30  -- minutes between slot options
)
RETURNS TABLE(slot_time TIME) AS $$
DECLARE
  v_staff         RECORD;
  v_day_name      TEXT;
  v_day_schedule  JSONB;
  v_start_time    TIME;
  v_end_time      TIME;
  v_current_slot  TIME;
BEGIN
  -- Get staff working hours
  SELECT * INTO v_staff FROM staff WHERE id = p_staff_id;

  v_day_name := LOWER(TO_CHAR(p_date, 'Day'));
  v_day_name := TRIM(v_day_name);

  v_day_schedule := v_staff.working_hours -> v_day_name;

  -- Staff is off on this day
  IF v_day_schedule IS NULL OR v_day_schedule = 'null'::JSONB THEN
    RETURN;
  END IF;

  v_start_time := (v_day_schedule->>'start')::TIME;
  v_end_time   := (v_day_schedule->>'end')::TIME;

  v_current_slot := v_start_time;

  WHILE v_current_slot + (p_duration_mins || ' minutes')::INTERVAL <= v_end_time LOOP
    IF check_booking_availability(p_staff_id, p_date, v_current_slot, p_duration_mins) THEN
      slot_time := v_current_slot;
      RETURN NEXT;
    END IF;
    v_current_slot := v_current_slot + (p_slot_interval || ' minutes')::INTERVAL;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;
