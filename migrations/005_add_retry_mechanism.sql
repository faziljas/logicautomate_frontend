-- ============================================================
-- Migration: add_retry_mechanism
-- Adds retry tracking to whatsapp_logs table
-- ============================================================

-- Add retry_count column to track retry attempts
ALTER TABLE whatsapp_logs
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_log_id UUID REFERENCES whatsapp_logs(id) ON DELETE SET NULL;

-- Index for finding logs that need retry
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_retry_pending
  ON whatsapp_logs(business_id, status, retry_count, sent_at DESC)
  WHERE status IN ('failed', 'undelivered') AND retry_count < 3;

-- Index for parent-child relationship
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_parent
  ON whatsapp_logs(parent_log_id)
  WHERE parent_log_id IS NOT NULL;
