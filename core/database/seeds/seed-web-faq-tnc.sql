-- Seed landing FAQ + Terms & Conditions from vibo-web copy (lib/constants.ts).
-- Prerequisites: run migrations (including web_faqs link columns).
--
-- Usage:
--   psql "$POSTGRES_SUPABASE_DB_URL" -f scripts/seed-web-faq-tnc.sql
--   psql "$POSTGRES_DB_URL" -f scripts/seed-web-faq-tnc.sql

BEGIN;

DELETE FROM web_faqs;
DELETE FROM web_tnc_sections;

-- ── FAQs (order matches vibo-web faqItems) ───────────────────────────────────

INSERT INTO web_faqs (question, answer, category, ord, is_live, link_label, link_href, answer_suffix)
VALUES
  (
    'Is VIBO actually free for attendees?',
    $a$Yes, genuinely. No trial, no 'free tier with limitations'. Discovering events, joining free events, seeing who's going, rating and reviewing — all free, forever. We make money from hosts who want to grow, not from people who just want to show up.$a$,
    'general',
    1,
    TRUE,
    NULL,
    NULL,
    NULL
  ),
  (
    'How do I know a host is trustworthy?',
    $a$Every host who runs paid events goes through real ID verification. Their trust score is built from real attendee ratings — visible to anyone. A host who ghosts an event gets permanently removed. We take this seriously because the whole thing only works if you feel safe showing up.$a$,
    'general',
    2,
    TRUE,
    NULL,
    NULL,
    NULL
  ),
  (
    'What happens to my money if a paid event falls apart?',
    $a$Your payment is held in escrow — with us, not the host — until the event is confirmed complete. If it doesn't happen, your full refund is automatic within 5–7 business days. You don't have to chase anyone.$a$,
    'general',
    3,
    TRUE,
    NULL,
    NULL,
    NULL
  ),
  (
    'I''ve never hosted before. Is this for me?',
    $a$Especially for you. You don't need experience, a following, or a budget. If you have an idea and a time slot, VIBO handles discovery and participants. Start small. See what happens.$a$,
    'general',
    4,
    TRUE,
    NULL,
    NULL,
    NULL
  ),
  (
    'Which cities is VIBO in right now?',
    $a$We're starting with Mumbai and expanding city by city — carefully, not everywhere at once.$a$,
    'general',
    5,
    TRUE,
    'Join the early access list',
    '#wl',
    $s$ and we'll email you the moment we open in your city.$s$
  ),
  (
    'What do you do with my personal data?',
    $a$Less than you'd expect. Your location shows you nearby events — never shared with hosts or other attendees. Verification documents are discarded after confirmation. We don't sell data. We don't run ads. VIBO exists to connect people, not monetise their attention.$a$,
    'general',
    6,
    TRUE,
    NULL,
    NULL,
    NULL
  );

-- ── Terms & Conditions (order matches vibo-web tncSections) ──────────────────
-- Paragraph = content (+ contentAfter where applicable). Yellow box = highlight_text.

INSERT INTO web_tnc_sections (title, content, ord, has_highlight, highlight_text, last_updated)
VALUES
  (
    'Who we are',
    $c$VIBO is a platform that helps people discover and attend local, in-person events. We connect attendees and hosts. We are not the organiser of any event listed on the platform — that's always the host.$c$,
    1,
    FALSE,
    NULL,
    '2025-12-01'::date
  ),
  (
    'What you''re agreeing to',
    $c$By creating an account, you confirm you're 18 or older, you'll provide accurate information, and you'll use VIBO in good faith. That's the foundation everything else is built on.$c$,
    2,
    FALSE,
    NULL,
    '2025-12-01'::date
  ),
  (
    'Your account',
    $c$You're responsible for your account. Don't share credentials, don't impersonate others, and keep your contact info current. If something looks wrong, tell us immediately at hello@vibo.in.$c$,
    3,
    FALSE,
    NULL,
    '2025-12-01'::date
  ),
  (
    'Hosting events',
    $c$Hosts are independent organisers. You own your event — VIBO provides the platform, not the venue, insurance, or staffing. You are responsible for what happens at your event.$c$,
    4,
    TRUE,
    $h$By hosting a paid event, you agree to our escrow payout policy: funds are held by the platform and released 48 hours after the event is confirmed complete, with no active disputes.$h$,
    '2025-12-01'::date
  ),
  (
    'Attending events',
    $c$You agree to treat hosts and fellow attendees with respect. Events are real-world experiences — behave as you would want others to behave toward you. VIBO has a zero-tolerance policy for harassment at events.$c$,
    5,
    FALSE,
    NULL,
    '2025-12-01'::date
  ),
  (
    'Payments and refunds',
    $c$For paid events: your payment is held in escrow until the event is confirmed complete. Platform fees, where applicable, are non-refundable once the event has taken place.$c$,
    6,
    TRUE,
    $h$If the host cancels or the event doesn't happen, you receive a full automatic refund within 5–7 business days. You don't have to ask for it.$h$,
    '2025-12-01'::date
  ),
  (
    'Verification and safety',
    $c$Identity verification builds trust. Verified hosts have confirmed their identity with a government-issued document. Verification does not guarantee the quality or safety of any event — always exercise personal judgment. Verification documents are processed and discarded after approval. We do not store them.$c$,
    7,
    FALSE,
    NULL,
    '2025-12-01'::date
  ),
  (
    'Content you post',
    $c$Reviews, ratings, and profile content remain yours. You grant VIBO a non-exclusive licence to display them on the platform. Don't post anything false, harmful, or that you don't have the right to share.$c$,
    8,
    FALSE,
    NULL,
    '2025-12-01'::date
  ),
  (
    'What we don''t guarantee',
    $c$We work hard to keep VIBO reliable and safe, but we can't guarantee that every event will be exactly as described, that the platform will be available 100% of the time, or that every host will be perfect. We do guarantee that we'll act in good faith and fix problems when they arise.$c$,
    9,
    FALSE,
    NULL,
    '2025-12-01'::date
  ),
  (
    'How to reach us',
    $c$For anything — complaints, questions, or ideas — email us at hello@vibo.in. We read every message.$c$,
    10,
    FALSE,
    NULL,
    '2025-12-01'::date
  );

COMMIT;

-- Optional CMS keys (separate from FAQ/T&C transaction)
INSERT INTO product_content (key, section, value, is_live)
VALUES
  (
    'stats',
    'product',
    '{"events_hosted": 2400, "avg_rating": 4.8, "cities": 12}'::jsonb,
    TRUE
  ),
  (
    'hero_badge',
    'marketing',
    to_jsonb('Early access open · Mumbai first'::text),
    TRUE
  ),
  (
    'pricing.host_boost',
    'pricing',
    to_jsonb('₹199'::text),
    TRUE
  ),
  (
    'pricing.host_unlimited',
    'pricing',
    to_jsonb('₹499/mo'::text),
    TRUE
  ),
  (
    'pricing.host_pro',
    'pricing',
    to_jsonb('₹999/mo'::text),
    TRUE
  ),
  (
    'pricing.ticketing_fee',
    'pricing',
    to_jsonb('6%'::text),
    TRUE
  )
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  section = EXCLUDED.section,
  is_live = EXCLUDED.is_live,
  updated_at = NOW();
