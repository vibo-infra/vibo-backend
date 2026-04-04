import { pool } from '../../core/database/client';

export type EmailLogInsert = {
  templateKey: string;
  recipientEmail: string;
  subject: string;
  metadata: Record<string, unknown>;
};

export const insertEmailLogQueued = async (p: EmailLogInsert): Promise<string> => {
  const { rows } = await pool.query(
    `INSERT INTO email_send_logs (template_key, recipient_email, subject, status, metadata)
     VALUES ($1, $2, $3, 'queued', $4::jsonb)
     RETURNING id`,
    [p.templateKey, p.recipientEmail, p.subject, JSON.stringify(p.metadata)]
  );
  return rows[0].id as string;
};

export const markEmailLogSent = async (
  id: string,
  providerMessageId: string | null
) => {
  await pool.query(
    `UPDATE email_send_logs
     SET status = 'sent', provider_message_id = $2, sent_at = NOW()
     WHERE id = $1`,
    [id, providerMessageId]
  );
};

export const markEmailLogFailed = async (id: string, errorMessage: string) => {
  await pool.query(
    `UPDATE email_send_logs
     SET status = 'failed', error_message = $2
     WHERE id = $1`,
    [id, errorMessage.slice(0, 2000)]
  );
};
