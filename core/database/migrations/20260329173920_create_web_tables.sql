-- Migration: create_web_tables
-- Created at: 2026-03-29T17:39:20.049Z

CREATE TABLE waitlist_signups (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT        NOT NULL UNIQUE,
  city           TEXT,
  role           TEXT        CHECK (role IN ('attendee', 'host')) DEFAULT 'attendee',
  source         TEXT,
  utm_source     TEXT,
  utm_medium     TEXT,
  utm_campaign   TEXT,
  ref_code_used  TEXT,
  referred_by    UUID        REFERENCES waitlist_signups(id) ON DELETE SET NULL,
  converted      BOOLEAN     NOT NULL DEFAULT FALSE,
  app_user_id    UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_waitlist_email     ON waitlist_signups(email);
CREATE INDEX idx_waitlist_city      ON waitlist_signups(city);
CREATE INDEX idx_waitlist_converted ON waitlist_signups(converted);

CREATE TABLE referral_codes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT        NOT NULL UNIQUE,
  owner_id     UUID        NOT NULL REFERENCES waitlist_signups(id) ON DELETE CASCADE,
  click_count  INT         NOT NULL DEFAULT 0,
  signup_count INT         NOT NULL DEFAULT 0,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refcodes_code  ON referral_codes(code);
CREATE INDEX idx_refcodes_owner ON referral_codes(owner_id);

CREATE TABLE product_content (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT        NOT NULL UNIQUE,
  section    TEXT        NOT NULL,
  value      JSONB       NOT NULL,
  is_live    BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pcontent_section ON product_content(section);
CREATE INDEX idx_pcontent_live    ON product_content(is_live);

CREATE TABLE web_faqs (
  id       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT    NOT NULL,
  answer   TEXT    NOT NULL,
  category TEXT    NOT NULL DEFAULT 'general',
  ord      INT     NOT NULL DEFAULT 0,
  is_live  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE web_tnc_sections (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT    NOT NULL,
  content        TEXT    NOT NULL,
  ord            INT     NOT NULL DEFAULT 0,
  has_highlight  BOOLEAN NOT NULL DEFAULT FALSE,
  highlight_text TEXT,
  last_updated   DATE    NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE web_help_articles (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT    NOT NULL,
  content    TEXT    NOT NULL,
  category   TEXT    NOT NULL DEFAULT 'general',
  slug       TEXT    NOT NULL UNIQUE,
  ord        INT     NOT NULL DEFAULT 0,
  is_live    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_help_slug     ON web_help_articles(slug);
CREATE INDEX idx_help_category ON web_help_articles(category);
CREATE INDEX idx_help_live     ON web_help_articles(is_live);