-- Staff push notification tokens (FCM or Web Push endpoint)
CREATE TABLE IF NOT EXISTS staff_push_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  device_info JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, token)
);

CREATE INDEX IF NOT EXISTS idx_staff_push_tokens_staff ON staff_push_tokens(staff_id);
