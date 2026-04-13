import * as webRepository from './web.repository';
import * as email from '../../shared/utils/email/email';
import {
  sendFileTemplateEmail,
  sendRawTransactionalEmail,
  buildWaitlistVariables,
  buildCityLaunchVariables,
  buildReferralMilestoneVariables,
  isFileTemplateKey,
  applyWaitlistCityDerivedFields,
} from '../../shared/email/sendTemplatedMail';
import type { EmailTemplateKey } from '../../shared/email/templateMeta';
import { generateReferralCode } from '../../shared/utils/email/referral';
import {
  JoinWaitlistInput,
  NotifyCityInput,
  ConvertSignupInput,
  WAITLIST_CITY_OPTIONS,
  UpdateWaitlistCityInput,
  SendEmailBatchInput,
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
      position:
        existing.signup_position != null ? Number(existing.signup_position) : null,
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

  const code = await generateUniqueCode(input.email);
  await webRepository.setWaitlistShareCode(code, signup.id);

  if (input.ref) {
    const count = await webRepository.countSignupsUsingRefCode(input.ref);
    if (count >= REFERRAL_MILESTONE) {
      const refRow = await webRepository.findReferralCode(input.ref);
      if (refRow) {
        email
          .sendReferralMilestone({
            to: refRow.owner_email,
            referralCode: refRow.code,
            count,
          })
          .catch((err) => console.error('[email] referral milestone failed:', err));
      }
    }
  }

  // Same # as UI — stored on row (signup_position), set by DB trigger
  const position =
    signup.signup_position != null
      ? Number(signup.signup_position)
      : (await webRepository.getWaitlistCount()).total;

  // Confirmation email — non-blocking, never fails registration
  email.sendWaitlistConfirmation({
    to:           input.email,
    referralCode: code,
    position,
    city:         input.city ?? null,
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

export const getWaitlistCountForCity = async (cityRaw: string) => {
  const city = String(cityRaw ?? '').trim();
  if (!city) {
    throw new Error('WAITLIST_CITY_QUERY_REQUIRED');
  }
  const count = await webRepository.countWaitlistByCity(city);
  return { count };
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
  return webRepository.getContentByKey(key  );
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

const NEARBY_EVENTS_MAX_LIMIT = 100;

export const getNearbyEvents = async (
  city: string,
  limit: number,
  category?: string,
) => {
  const n = Number(limit);
  const safeLimit = Math.min(
    Math.max(Number.isFinite(n) && n > 0 ? Math.floor(n) : 20, 1),
    NEARBY_EVENTS_MAX_LIMIT
  );
  const rows = await webRepository.getNearbyEvents({
    city,
    limit: safeLimit,
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

  return { queued: sent, dry_run: false, preview: null };
};

// ── Batch / personalised sends (internal API) ─────────────────────────────────

type BatchRow = { email: string; variables: Record<string, string> };

async function resolveRecipientsForBatch(
  input: SendEmailBatchInput
): Promise<BatchRow[]> {
  if (input.recipients?.length) {
    return input.recipients.map((r) => ({
      email: r.email.trim(),
      variables: { ...(r.variables || {}) },
    }));
  }
  const f = input.filter;
  if (!f) {
    throw new Error('EMAIL_BATCH_NO_RECIPIENTS');
  }
  if (f.city) {
    const rows = await webRepository.getSignupsByCity(f.city);
    return rows.map((r) => ({ email: r.email, variables: {} }));
  }
  if (f.used_referral_code) {
    const rows = await webRepository.getSignupsByReferralCodeUsed(
      f.used_referral_code
    );
    return rows.map((r) => ({
      email: r.email,
      variables: {
        city: r.city || '',
        role: r.role,
      },
    }));
  }
  if (f.all_waitlist) {
    if (!input.confirm_all_waitlist) {
      throw new Error('EMAIL_BATCH_CONFIRM_ALL_REQUIRED');
    }
    const rows = await webRepository.getAllNonConvertedWaitlist();
    return rows.map((r) => ({
      email: r.email,
      variables: {
        city: r.city || '',
        role: r.role,
      },
    }));
  }
  throw new Error('EMAIL_BATCH_NO_RECIPIENTS');
}

/** If `waitlist_confirmation` and recipient omitted position/code, load from DB. */
async function enrichWaitlistConfirmationRow(row: BatchRow): Promise<void> {
  const v = row.variables || {};
  const hasPos =
    v.position != null && String(v.position).trim() !== '';
  const codeRaw = v.referralCode ?? v.referral_code;
  const hasCode = Boolean(codeRaw && String(codeRaw).trim() !== '');
  if (hasPos && hasCode) return;

  const db = await webRepository.getWaitlistConfirmationDataByEmail(row.email);
  if (!db) {
    throw new Error(
      `No active waitlist signup found for ${row.email} (or already converted)`
    );
  }
  if (!db.referral_code) {
    throw new Error(`No referral code on file for ${row.email}`);
  }

  row.variables = {
    ...v,
    position: hasPos ? String(v.position) : String(db.position),
    referralCode: hasCode ? String(codeRaw) : db.referral_code,
    city: (v.city != null && String(v.city).trim() !== ''
      ? v.city
      : db.city || '') as string,
  };
}

function buildVarsForTemplate(
  templateKey: EmailTemplateKey,
  row: BatchRow,
  input: SendEmailBatchInput
): Record<string, string> {
  const g = input.global_variables || {};
  const v = row.variables;

  if (templateKey === 'city_launch') {
    const city =
      v.city || input.filter?.city || g.city || 'Mumbai';
    const base = buildCityLaunchVariables(city, input.message);
    return { ...base, ...g, ...v };
  }
  if (templateKey === 'waitlist_confirmation') {
    const pos = v.position ?? g.position;
    const code = v.referralCode ?? v.referral_code ?? g.referralCode;
    if (pos == null || pos === '' || !code) {
      throw new Error(
        'waitlist_confirmation needs variables.position and variables.referralCode per recipient (or global_variables)'
      );
    }
    const base = buildWaitlistVariables({
      position: pos,
      referralCode: code,
      city: v.city || g.city || null,
    });
    const merged = { ...base, ...g, ...v } as Record<string, string>;
    applyWaitlistCityDerivedFields(merged);
    return merged;
  }
  if (templateKey === 'referral_milestone') {
    const code = v.referralCode ?? g.referralCode;
    const count = v.count ?? g.count;
    if (!code || count == null || count === '') {
      throw new Error(
        'referral_milestone needs variables.referralCode and variables.count'
      );
    }
    const base = buildReferralMilestoneVariables({
      referralCode: code,
      count,
    });
    return { ...base, ...g, ...v };
  }
  return { ...g, ...v };
}

export const sendEmailBatch = async (input: SendEmailBatchInput) => {
  if (input.template_key === 'raw_transactional') {
    if (
      !input.raw?.subject?.trim() ||
      input.raw.html == null ||
      input.raw.text == null
    ) {
      throw new Error('EMAIL_BATCH_RAW_INVALID');
    }
    const list = await resolveRecipientsForBatch(input);
    if (input.dry_run) {
      return {
        dry_run: true,
        total: list.length,
        previews: list.slice(0, 5).map((r) => ({ email: r.email })),
      };
    }
    const results: unknown[] = [];
    for (const row of list) {
      const r = await sendRawTransactionalEmail({
        to: row.email,
        subject: input.raw.subject,
        html: input.raw.html,
        text: input.raw.text,
        templateKeyForLog: 'raw_transactional',
        logContext: { trigger: 'api_send_batch', filter: input.filter },
      });
      results.push({
        email: row.email,
        ok: r.ok,
        log_id: r.logId,
        message_id: 'messageId' in r ? r.messageId : undefined,
        error: 'error' in r ? r.error : undefined,
      });
    }
    return { dry_run: false, total: list.length, results };
  }

  if (!isFileTemplateKey(input.template_key)) {
    throw new Error('EMAIL_BATCH_INVALID_TEMPLATE');
  }

  const templateKey = input.template_key as EmailTemplateKey;

  if (templateKey === 'referral_milestone' && !input.recipients?.length) {
    throw new Error(
      'referral_milestone must use explicit recipients (referrer email + referralCode + count)'
    );
  }

  let list: BatchRow[];

  if (
    templateKey === 'waitlist_confirmation' &&
    input.filter?.all_waitlist &&
    input.confirm_all_waitlist
  ) {
    const rows = await webRepository.getWaitlistWithReferralForResend();
    const skipped: { email: string; reason: string }[] = [];
    list = [];
    for (const r of rows) {
      if (!r.referral_code) {
        skipped.push({ email: r.email, reason: 'no_referral_code' });
        continue;
      }
      list.push({
        email: r.email,
        variables: {
          position: String(r.position),
          referralCode: r.referral_code,
          city: r.city || '',
        },
      });
    }
    if (input.dry_run) {
      const previews = list.slice(0, 5).map((row) => {
        try {
          const variables = buildVarsForTemplate(templateKey, row, input);
          return { email: row.email, variables };
        } catch (e: unknown) {
          return {
            email: row.email,
            error: e instanceof Error ? e.message : String(e),
          };
        }
      });
      return {
        dry_run: true,
        total: list.length,
        skipped_no_code: skipped.length,
        skipped,
        previews,
      };
    }
    const results: unknown[] = [];
    for (const s of skipped) {
      results.push({ email: s.email, ok: false, error: s.reason });
    }
    for (const row of list) {
      try {
        const variables = buildVarsForTemplate(templateKey, row, input);
        const r = await sendFileTemplateEmail({
          templateKey,
          to: row.email,
          variables,
          subjectOverride: input.subject_override,
          logContext: {
            trigger: 'api_send_batch_waitlist_resend',
            filter: input.filter,
          },
        });
        results.push({
          email: row.email,
          ok: r.ok,
          log_id: r.logId,
          message_id: 'messageId' in r ? r.messageId : undefined,
          error: 'error' in r ? r.error : undefined,
        });
      } catch (e: unknown) {
        results.push({
          email: row.email,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return {
      dry_run: false,
      total: list.length,
      skipped_no_code: skipped.length,
      results,
    };
  }

  if (templateKey === 'waitlist_confirmation' && !input.recipients?.length) {
    throw new Error(
      'waitlist_confirmation: pass recipients[], or filter.all_waitlist + confirm_all_waitlist'
    );
  }

  list = await resolveRecipientsForBatch(input);

  if (input.dry_run) {
    const previews: unknown[] = [];
    for (const row of list.slice(0, 5)) {
      try {
        const rowCopy = {
          email: row.email,
          variables: { ...row.variables },
        };
        if (templateKey === 'waitlist_confirmation') {
          await enrichWaitlistConfirmationRow(rowCopy);
        }
        const variables = buildVarsForTemplate(
          templateKey,
          rowCopy,
          input
        );
        previews.push({ email: row.email, variables });
      } catch (e: unknown) {
        previews.push({
          email: row.email,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return { dry_run: true, total: list.length, previews };
  }

  const results: unknown[] = [];
  for (const row of list) {
    try {
      if (templateKey === 'waitlist_confirmation') {
        await enrichWaitlistConfirmationRow(row);
      }
      const variables = buildVarsForTemplate(templateKey, row, input);
      const r = await sendFileTemplateEmail({
        templateKey,
        to: row.email,
        variables,
        subjectOverride: input.subject_override,
        logContext: { trigger: 'api_send_batch', filter: input.filter },
      });
      results.push({
        email: row.email,
        ok: r.ok,
        log_id: r.logId,
        message_id: 'messageId' in r ? r.messageId : undefined,
        error: 'error' in r ? r.error : undefined,
      });
    } catch (e: unknown) {
      results.push({
        email: row.email,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { dry_run: false, total: list.length, results };
};

// ── Private helpers ───────────────────────────────────────────────────────────

const generateUniqueCode = async (email: string): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode(email);
    const taken = await webRepository.isReferralCodeTaken(code);
    if (!taken) return code;
  }
  throw new Error('REFERRAL_CODE_COLLISION');
};