-- Optional inline link inside FAQ answer (matches landing FAQ with “Join the early access list”).

ALTER TABLE web_faqs
  ADD COLUMN IF NOT EXISTS link_label TEXT,
  ADD COLUMN IF NOT EXISTS link_href TEXT,
  ADD COLUMN IF NOT EXISTS answer_suffix TEXT;
