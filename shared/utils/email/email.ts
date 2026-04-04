// Public entry points for web module — templates live under shared/email/templates/
// Logging + Resend live in shared/email/sendTemplatedMail.ts

import {
  sendFileTemplateEmail,
  buildWaitlistVariables,
  buildCityLaunchVariables,
  buildReferralMilestoneVariables,
} from '../../email/sendTemplatedMail';

export const sendWaitlistConfirmation = async (params: {
  to: string;
  referralCode: string;
  position: number;
  city?: string | null;
}): Promise<void> => {
  const variables = buildWaitlistVariables({
    position: params.position,
    referralCode: params.referralCode,
    city: params.city ?? null,
  });
  const r = await sendFileTemplateEmail({
    templateKey: 'waitlist_confirmation',
    to: params.to,
    variables,
    logContext: { trigger: 'waitlist_signup' },
  });
  if (!r.ok) throw new Error(r.error);
};

export const sendCityLaunch = async (params: {
  to: string;
  city: string;
  customMessage?: string;
}): Promise<void> => {
  const variables = buildCityLaunchVariables(
    params.city,
    params.customMessage ?? null
  );
  const r = await sendFileTemplateEmail({
    templateKey: 'city_launch',
    to: params.to,
    variables,
    logContext: { trigger: 'city_launch' },
  });
  if (!r.ok) throw new Error(r.error);
};

export const sendReferralMilestone = async (params: {
  to: string;
  referralCode: string;
  count: number;
}): Promise<void> => {
  const variables = buildReferralMilestoneVariables({
    referralCode: params.referralCode,
    count: params.count,
  });
  const r = await sendFileTemplateEmail({
    templateKey: 'referral_milestone',
    to: params.to,
    variables,
    logContext: { trigger: 'referral_milestone' },
  });
  if (!r.ok) throw new Error(r.error);
};
