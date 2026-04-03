import * as webRepository from './web.repository';
import * as analyticsService from '../analytics/analytics.service';
import * as email from '../../shared/utils/email/email';
import { generateReferralCode } from '../../shared/utils/email/referral';
import {
  JoinWaitlistInput,
  NotifyCityInput,
  ConvertSignupInput,
  WAITLIST_CITY_OPTIONS,
  UpdateWaitlistCityInput,
} from './web.types';

const REFERRAL_MILESTONE = 3;

// ── Waitlist ──────────────────────────────────────────────────────────────────

export const joinWaitlist = async (input: JoinWaitlistInput) => {
  // Idempotent — return existing data if already signed up
  const existing = await webRepository.findSignupByEmail(input.email);
  if (existing) {
    const refCode = await webRepository.getReferralCodeByOwner(existing.id);
    return {
      already_registered: true,
      referral_code: refCode?.code ?? null,
      position: null,
    };
  }

  // Resolve referred_by from ref code if provided
  let referredById: string | null = null;
  if (input.ref) {
    const owner = await webRepository.findOwnerByReferralCode(input.ref);
    if (owner) referredById = owner.referred_by_id;
  }

  // Insert signup
  const signup = await webRepository.insertSignup({
    email:       input.email,
    city:        input.city        ?? null,
    role:        input.role        ?? 'attendee',
    source:      input.source      ?? null,
    utmSource:   input.utm_source  ?? null,
    utmMedium:   input.utm_medium  ?? null,
    utmCampaign: input.utm_campaign ?? null,
    refCodeUsed: input.ref         ?? null,
    referredBy:  referredById,
  });

  // Generate unique referral code — retry up to 5x on collision
  const code = await generateUniqueCode(input.email);
  await webRepository.insertReferralCode(code, signup.id);

  // If came via ref, increment the referrer's signup count
  // and trigger milestone email if they've hit the threshold
  if (input.ref) {
    await webRepository.incrementReferralSignup(input.ref);
    const refRow = await webRepository.findReferralCode(input.ref);
    if (refRow && refRow.signup_count + 1 >= REFERRAL_MILESTONE) {
      email.sendReferralMilestone({
        to:           refRow.owner_email,
        referralCode: refRow.code,
        count:        refRow.signup_count + 1,
      }).catch(err => console.error('[email] referral milestone failed:', err));
    }
  }

  // Queue position
  const countData = await webRepository.getWaitlistCount();
  const position  = countData.total;

  // Confirmation email — non-blocking, never fails registration
  email.sendWaitlistConfirmation({
    to:           input.email,
    referralCode: code,
    position,
  }).catch(err => console.error('[email] waitlist confirmation failed:', err));

  return {
    already_registered: false,
    referral_code:      code,
    position,
  };
};

export const getWaitlistCount = async () => {
  const data = await webRepository.getWaitlistCount();
  return {
    total:   data.total,
    by_role: { attendees: data.attendees, hosts: data.hosts },
    by_city: data.by_city ?? [],
  };
};

/** Optional follow-up after join — `city` must be one of the allowed metro labels. */
export const updateWaitlistCity = async (input: UpdateWaitlistCityInput) => {
  const email = input.email?.trim();
  const cityRaw = input.city?.trim();
  if (!email) {
    throw new Error('WAITLIST_CITY_EMAIL_REQUIRED');
  }
  if (!cityRaw) {
    throw new Error('WAITLIST_CITY_VALUE_REQUIRED');
  }
  if (!WAITLIST_CITY_OPTIONS.includes(cityRaw as (typeof WAITLIST_CITY_OPTIONS)[number])) {
    throw new Error('WAITLIST_CITY_INVALID');
  }

  const row = await webRepository.updateWaitlistCity(email, cityRaw);
  if (!row) {
    throw new Error('WAITLIST_SIGNUP_NOT_FOUND');
  }

  return { updated: true as const, city: row.city as string };
};

export const convertSignup = async (input: ConvertSignupInput) => {
  const row = await webRepository.convertSignup(input.email, input.user_id);
  if (!row) throw new Error('WAITLIST_SIGNUP_NOT_FOUND');
  return { converted: true };
};

// ── Referral ──────────────────────────────────────────────────────────────────

export const getReferralCode = async (code: string) => {
  const row = await webRepository.findReferralCode(code.toUpperCase());
  if (!row || !row.is_active) return null;

  // Best-effort first name from email prefix
  const raw = row.owner_email.split('@')[0].replace(/[^a-zA-Z]/g, '');
  const displayName = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();

  return {
    valid:        true,
    owner_name:   displayName,
    signup_count: row.signup_count,
  };
};

export const recordReferralClick = async (code: string) => {
  await webRepository.incrementReferralClick(code.toUpperCase());
};

// ── Content ───────────────────────────────────────────────────────────────────

export const getContent = async (section?: string) => {
  const rows = await webRepository.getAllContent(section);
  // Flatten to key → value map for easy consumption by NextJS
  return rows.reduce(
    (acc: Record<string, unknown>, row: { key: string; value: unknown }) => {
      acc[row.key] = row.value;
      return acc;
    },
    {}
  );
};

export const getContentByKey = async (key: string) => {
  return webRepository.getContentByKey(key);
};

// ── FAQs ──────────────────────────────────────────────────────────────────────

export const getFaqs = async (category?: string) => {
  return webRepository.getAllFaqs(category);
};

// ── T&C ───────────────────────────────────────────────────────────────────────

export const getTnc = async () => {
  const sections = await webRepository.getTncSections();
  const lastUpdated = sections[0]?.last_updated ?? new Date().toISOString().split('T')[0];
  return { last_updated: lastUpdated, sections };
};

// ── Help ──────────────────────────────────────────────────────────────────────

export const getHelpArticles = async (category?: string) => {
  return webRepository.getAllHelpArticles(category);
};

export const getHelpArticle = async (slug: string) => {
  const article = await webRepository.getHelpArticleBySlug(slug);
  if (!article) throw new Error('HELP_ARTICLE_NOT_FOUND');
  return article;
};

// ── Events nearby ─────────────────────────────────────────────────────────────

export const getNearbyEvents = async (
  city: string,
  limit: number,
  category?: string,
) => {
  const rows = await webRepository.getNearbyEvents({
    city,
    limit:    Math.min(limit, 12),
    category: category ?? null,
  });

  return rows.map((r: any) => ({
    id:        r.id,
    title:     r.title,
    category:  r.category,
    location:  r.location,
    city:      r.city,
    price:     r.price ? parseFloat(r.price) : null,
    is_free:   r.is_free,
    starts_at: r.starts_at,
  }));
};

// ── City launch email ─────────────────────────────────────────────────────────

export const notifyCity = async (input: NotifyCityInput) => {
  const recipients = await webRepository.getSignupsByCity(input.city);

  if (input.dry_run) {
    return {
      queued:  recipients.length,
      dry_run: true,
      preview: `Would email ${recipients.length} people in ${input.city}`,
    };
  }

  const BATCH = 50;
  let sent = 0;

  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    await Promise.all(
      batch.map(r =>
        email.sendCityLaunch({
          to:            r.email,
          city:          input.city,
          customMessage: input.message,
        }).catch(err =>
          console.error('[email] city notify failed for', r.email, err)
        )
      )
    );
    sent += batch.length;
  }

  // Track the launch blast as an analytics event
  analyticsService.track({
    session_id: 'system',
    source:     'admin',
    events: [{
      event_type: 'city_launch_email_sent',
      city:       input.city,
      metadata:   { count: sent },
    }],
  }).catch(() => {});

  return { queued: sent, dry_run: false, preview: null };
};

// ── Private helpers ───────────────────────────────────────────────────────────

const generateUniqueCode = async (email: string): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode(email);
    const existing = await webRepository.findReferralCode(code);
    if (!existing) return code;
  }
  throw new Error('REFERRAL_CODE_COLLISION');
};