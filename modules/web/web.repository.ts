import { pool } from '../../core/database/client';
import { webQueries } from './web.queries';
import { InsertSignupParams, NearbyEventsParams } from './web.types';

// ── Waitlist ──────────────────────────────────────────────────────────────────

export const findSignupByEmail = async (email: string) => {
  const { rows } = await pool.query(webQueries.findSignupByEmail, [email]);
  return rows[0] ?? null;
};

export const insertSignup = async (p: InsertSignupParams) => {
  const { rows } = await pool.query(webQueries.insertSignup, [
    p.email, p.city, p.role, p.source,
    p.utmSource, p.utmMedium, p.utmCampaign,
    p.refCodeUsed, p.referredBy,
  ]);
  return rows[0];
};

export const getWaitlistCount = async () => {
  const { rows } = await pool.query(webQueries.getWaitlistCount);
  return rows[0];
};

export const updateWaitlistCity = async (email: string, city: string) => {
  const { rows } = await pool.query(webQueries.updateWaitlistCity, [email, city]);
  return rows[0] ?? null;
};

export const convertSignup = async (email: string, appUserId: string) => {
  const { rows } = await pool.query(webQueries.convertSignup, [email, appUserId]);
  return rows[0] ?? null;
};

export const getSignupsByCity = async (city: string) => {
  const { rows } = await pool.query(webQueries.getSignupsByCity, [city]);
  return rows as { email: string; id: string }[];
};

export const getSignupsByReferralCodeUsed = async (code: string) => {
  const { rows } = await pool.query(webQueries.getSignupsByReferralCodeUsed, [code]);
  return rows as {
    email: string;
    id: string;
    city: string | null;
    role: string;
    ref_code_used: string | null;
  }[];
};

export const getAllNonConvertedWaitlist = async () => {
  const { rows } = await pool.query(webQueries.getAllNonConvertedWaitlist);
  return rows as {
    email: string;
    id: string;
    city: string | null;
    role: string;
    ref_code_used: string | null;
  }[];
};

export const getWaitlistWithReferralForResend = async () => {
  const { rows } = await pool.query(webQueries.getWaitlistWithReferralForResend);
  return rows as {
    email: string;
    city: string | null;
    referral_code: string | null;
    position: number;
  }[];
};

export const getWaitlistConfirmationDataByEmail = async (email: string) => {
  const { rows } = await pool.query(webQueries.getWaitlistConfirmationDataByEmail, [
    email,
  ]);
  const r = rows[0] as
    | {
        email: string;
        city: string | null;
        referral_code: string | null;
        position: number;
      }
    | undefined;
  return r ?? null;
};

// ── Referral ──────────────────────────────────────────────────────────────────

export const insertReferralCode = async (code: string, ownerId: string) => {
  const { rows } = await pool.query(webQueries.insertReferralCode, [code, ownerId]);
  return rows[0];
};

export const getReferralCodeByOwner = async (ownerId: string) => {
  const { rows } = await pool.query(webQueries.getReferralCodeByOwner, [ownerId]);
  return rows[0] ?? null;
};

export const findReferralCode = async (code: string) => {
  const { rows } = await pool.query(webQueries.findReferralCode, [code]);
  return rows[0] ?? null;
};

export const findOwnerByReferralCode = async (code: string) => {
  const { rows } = await pool.query(webQueries.findOwnerByReferralCode, [code]);
  return rows[0] ?? null;
};

export const incrementReferralClick = async (code: string) => {
  await pool.query(webQueries.incrementReferralClick, [code]);
};

export const incrementReferralSignup = async (code: string) => {
  await pool.query(webQueries.incrementReferralSignup, [code]);
};

// ── Content ───────────────────────────────────────────────────────────────────

export const getAllContent = async (section?: string) => {
  if (section) {
    const { rows } = await pool.query(webQueries.getContentBySection, [section]);
    return rows;
  }
  const { rows } = await pool.query(webQueries.getAllContent);
  return rows;
};

export const getContentByKey = async (key: string) => {
  const { rows } = await pool.query(webQueries.getContentByKey, [key]);
  return rows[0] ?? null;
};

// ── FAQs ──────────────────────────────────────────────────────────────────────

export const getAllFaqs = async (category?: string) => {
  if (category) {
    const { rows } = await pool.query(webQueries.getFaqsByCategory, [category]);
    return rows;
  }
  const { rows } = await pool.query(webQueries.getAllFaqs);
  return rows;
};

// ── T&C ───────────────────────────────────────────────────────────────────────

export const getTncSections = async () => {
  const { rows } = await pool.query(webQueries.getTncSections);
  return rows;
};

// ── Help ──────────────────────────────────────────────────────────────────────

export const getAllHelpArticles = async (category?: string) => {
  if (category) {
    const { rows } = await pool.query(webQueries.getHelpByCategory, [category]);
    return rows;
  }
  const { rows } = await pool.query(webQueries.getAllHelpArticles);
  return rows;
};

export const getHelpArticleBySlug = async (slug: string) => {
  const { rows } = await pool.query(webQueries.getHelpArticleBySlug, [slug]);
  return rows[0] ?? null;
};

// ── Events nearby ─────────────────────────────────────────────────────────────

export const getNearbyEvents = async (p: NearbyEventsParams) => {
  const { rows } = await pool.query(webQueries.getNearbyEvents, [
    p.city,
    p.category ?? null,
    p.limit,
  ]);
  return rows;
};