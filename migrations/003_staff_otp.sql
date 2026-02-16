-- Staff OTP for PWA login (phone + OTP)
CREATE TABLE IF NOT EXISTS staff_otp (
  phone          TEXT PRIMARY KEY,
  otp            TEXT NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_otp_expires ON staff_otp(expires_at);
