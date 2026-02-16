-- ============================================================
-- BookFlow: Payments refund and tracking columns
-- 004_payments_refund_columns.sql
-- ============================================================

-- Add refund tracking columns to payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS refund_id       TEXT,
  ADD COLUMN IF NOT EXISTS refund_amount   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS refund_status   TEXT CHECK (refund_status IN ('pending', 'processed', 'waived')),
  ADD COLUMN IF NOT EXISTS refund_reason   TEXT,
  ADD COLUMN IF NOT EXISTS refunded_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_code      TEXT,
  ADD COLUMN IF NOT EXISTS error_message   TEXT;

-- Index for refund lookups
CREATE INDEX IF NOT EXISTS idx_payments_refund_id ON payments(refund_id) WHERE refund_id IS NOT NULL;
