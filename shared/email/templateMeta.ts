/**
 * Maps template keys → default subject pattern + filenames under shared/email/templates/
 * Subjects support {{placeholders}} replaced with the same vars as HTML/text bodies.
 */

export const EMAIL_TEMPLATE_KEYS = [
  'waitlist_confirmation',
  'city_launch',
  'referral_milestone',
] as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

export type TemplateMeta = {
  subjectTemplate: string;
  htmlFile: string;
  textFile: string;
};

export const TEMPLATE_META: Record<EmailTemplateKey, TemplateMeta> = {
  waitlist_confirmation: {
    subjectTemplate: "You're #{{position}} on the VIBO waitlist{{subject_suffix}}",
    htmlFile: 'waitlist-confirmation.html',
    textFile: 'waitlist-confirmation.txt',
  },
  city_launch: {
    subjectTemplate: "The wait is over — VIBO is live in {{city}}",
    htmlFile: 'city-launch.html',
    textFile: 'city-launch.txt',
  },
  referral_milestone: {
    subjectTemplate: '{{count}} people joined VIBO through your link',
    htmlFile: 'referral-milestone.html',
    textFile: 'referral-milestone.txt',
  },
};

export function isFileTemplateKey(k: string): k is EmailTemplateKey {
  return (EMAIL_TEMPLATE_KEYS as readonly string[]).includes(k);
}