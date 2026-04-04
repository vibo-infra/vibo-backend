import { Resend } from 'resend';
import * as emailLog from './emailLog.repository';
import { loadAndRender, interpolate } from './renderTemplate';
import type { EmailTemplateKey } from './templateMeta';
import { isFileTemplateKey } from './templateMeta';

const resend = new Resend(process.env.RESEND_API_KEY ?? '');

/** Verified in Resend; override with EMAIL_FROM="VIBO <hello@yourdomain.com>" */
const defaultFrom = () =>
  process.env.EMAIL_FROM?.trim() || 'VIBO <email@hellovibo.in>';

const replyTo = () =>
  process.env.EMAIL_REPLY_TO?.trim() || process.env.SUPPORT_EMAIL?.trim() || undefined;

const siteUrl = () =>
  (process.env.PUBLIC_WEB_URL || 'https://hellovibo.in').replace(/\/$/, '');

const supportEmail = () => process.env.SUPPORT_EMAIL || 'sayhellovibo@gmail.com';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Sets city_label, subject_suffix, spot_subtitle, intro paragraphs from merged vars.
 * No city → neutral copy (no fake default city).
 */
export function applyWaitlistCityDerivedFields(v: Record<string, string>): void {
  const city = (v.city_label?.trim() || v.city?.trim() || '').trim();
  v.city_label = city;
  const has = city.length > 0;

  v.subject_suffix = has ? ` in ${city}` : '';
  v.spot_subtitle = has ? `in ${city}` : 'Early access';

  v.txt_header_suffix = has ? ` (${city})` : '';

  if (has) {
    const esc = escapeHtml(city);
    v.intro_paragraph_inner = `We've saved your spot on the VIBO waitlist for <strong>${esc}</strong>. The moment we're ready for you, this inbox gets the first ping — no one else's.`;
    v.intro_paragraph_text = `We've saved your spot on the VIBO waitlist for ${city}. The moment we're ready for you, this inbox gets the first ping — no one else's.`;
  } else {
    v.intro_paragraph_inner = `We've saved your spot on the VIBO waitlist. You haven't chosen a city yet — that's completely fine. Add one when you're ready, or we'll connect you when VIBO is live in your area. This inbox still gets the first ping when it's time.`;
    v.intro_paragraph_text = `We've saved your spot on the VIBO waitlist. You haven't chosen a city yet — that's fine. Add one when you're ready, or we'll connect you when VIBO is live in your area. This inbox still gets the first ping when it's time.`;
  }
}

export type SendFileTemplateParams = {
  templateKey: EmailTemplateKey;
  to: string;
  variables: Record<string, string>;
  /** If set, replaces the default subject from templateMeta (still supports {{vars}}). */
  subjectOverride?: string;
  /** Extra rows stored in email_send_logs.metadata */
  logContext?: Record<string, unknown>;
};

/**
 * Sends one templated email, logs queued → sent/failed.
 * Uses multipart HTML + plain text and Reply-To for inbox placement.
 */
export async function sendFileTemplateEmail(
  p: SendFileTemplateParams
): Promise<{ ok: true; logId: string; messageId?: string } | { ok: false; logId: string; error: string }> {
  const rendered = await loadAndRender(p.templateKey, p.variables);
  const subject = p.subjectOverride
    ? interpolate(p.subjectOverride, p.variables)
    : rendered.subject;
  const html = rendered.html;
  const text = rendered.text;

  const logId = await emailLog.insertEmailLogQueued({
    templateKey: p.templateKey,
    recipientEmail: p.to,
    subject,
    metadata: {
      variables: p.variables,
      ...(p.subjectOverride ? { subjectOverride: p.subjectOverride } : {}),
      ...p.logContext,
    },
  });

  if (!process.env.RESEND_API_KEY?.trim()) {
    const err = 'RESEND_API_KEY is not set';
    await emailLog.markEmailLogFailed(logId, err);
    return { ok: false, logId, error: err };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: defaultFrom(),
      to: p.to,
      subject,
      html,
      text,
      replyTo: replyTo(),
      headers: {
        'X-Entity-Ref-ID': logId,
      },
    });

    if (error) {
      const msg = typeof error === 'object' && error && 'message' in error
        ? String((error as { message: string }).message)
        : JSON.stringify(error);
      await emailLog.markEmailLogFailed(logId, msg);
      return { ok: false, logId, error: msg };
    }

    const messageId = data?.id ?? null;
    await emailLog.markEmailLogSent(logId, messageId);
    return { ok: true, logId, messageId: messageId ?? undefined };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await emailLog.markEmailLogFailed(logId, msg);
    return { ok: false, logId, error: msg };
  }
}

/** City launch: builds variables from defaults + optional custom HTML fragment. */
export function buildCityLaunchVariables(
  city: string,
  customHtml?: string | null
): Record<string, string> {
  const appStore = process.env.APP_STORE_URL || 'https://apps.apple.com/';
  const playStore = process.env.PLAY_STORE_URL || 'https://play.google.com/store';
  const defaultInner = `
<p>Download the app and sign in with this email to pick up your early-access perks.</p>
`.trim();
  const inner = customHtml?.trim() ? customHtml : defaultInner;
  const plainDefault =
    'Download the app and sign in with this email to pick up your early-access perks.';
  const plainCustom = customHtml
    ? customHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : plainDefault;

  return {
    city,
    body_inner: inner,
    body_plain: plainCustom,
    app_store_url: appStore,
    play_store_url: playStore,
  };
}

/** Waitlist confirmation variables (call after you know position + code). */
export function buildWaitlistVariables(params: {
  position: number | string;
  referralCode: string;
  city?: string | null;
}): Record<string, string> {
  const base = siteUrl();
  const out: Record<string, string> = {
    position: String(params.position),
    referralCode: params.referralCode,
    referralUrl: `${base}/?ref=${encodeURIComponent(params.referralCode)}`,
    city_label: (params.city ?? '').trim(),
    site_url: base,
    support_email: supportEmail(),
  };
  applyWaitlistCityDerivedFields(out);
  return out;
}

export function buildReferralMilestoneVariables(params: {
  referralCode: string;
  count: number | string;
}): Record<string, string> {
  const base = siteUrl();
  return {
    count: String(params.count),
    referralCode: params.referralCode,
    referralUrl: `${base}/?ref=${encodeURIComponent(params.referralCode)}`,
  };
}

export async function sendRawTransactionalEmail(p: {
  to: string;
  subject: string;
  html: string;
  text: string;
  templateKeyForLog: string;
  logContext?: Record<string, unknown>;
}): Promise<{ ok: true; logId: string; messageId?: string } | { ok: false; logId: string; error: string }> {
  const logId = await emailLog.insertEmailLogQueued({
    templateKey: p.templateKeyForLog,
    recipientEmail: p.to,
    subject: p.subject,
    metadata: { mode: 'raw', ...p.logContext },
  });

  if (!process.env.RESEND_API_KEY?.trim()) {
    const err = 'RESEND_API_KEY is not set';
    await emailLog.markEmailLogFailed(logId, err);
    return { ok: false, logId, error: err };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: defaultFrom(),
      to: p.to,
      subject: p.subject,
      html: p.html,
      text: p.text,
      replyTo: replyTo(),
      headers: { 'X-Entity-Ref-ID': logId },
    });

    if (error) {
      const msg = typeof error === 'object' && error && 'message' in error
        ? String((error as { message: string }).message)
        : JSON.stringify(error);
      await emailLog.markEmailLogFailed(logId, msg);
      return { ok: false, logId, error: msg };
    }

    const messageId = data?.id ?? null;
    await emailLog.markEmailLogSent(logId, messageId);
    return { ok: true, logId, messageId: messageId ?? undefined };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await emailLog.markEmailLogFailed(logId, msg);
    return { ok: false, logId, error: msg };
  }
}

export { isFileTemplateKey };
