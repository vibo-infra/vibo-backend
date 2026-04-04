-- Outbound email audit trail (every send attempt)

CREATE TABLE email_send_logs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key         TEXT        NOT NULL,
  recipient_email      TEXT        NOT NULL,
  subject              TEXT        NOT NULL,
  status               TEXT        NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
  provider             TEXT        NOT NULL DEFAULT 'resend',
  provider_message_id  TEXT,
  error_message        TEXT,
  metadata             JSONB       NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at              TIMESTAMPTZ
);

CREATE INDEX idx_email_send_logs_recipient ON email_send_logs(recipient_email);
CREATE INDEX idx_email_send_logs_template  ON email_send_logs(template_key);
CREATE INDEX idx_email_send_logs_status    ON email_send_logs(status);
CREATE INDEX idx_email_send_logs_created   ON email_send_logs(created_at DESC);
