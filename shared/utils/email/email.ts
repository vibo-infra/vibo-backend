// Thin wrapper around Resend.
// Only two emails needed at MVP: waitlist confirmation and city launch.
// Add new email types here as named methods — never call Resend directly elsewhere.

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = 'VIBO <sayhellovibo@gmail.com>';

export const sendWaitlistConfirmation = async (params: {
  to: string;
  referralCode: string;
  position: number;
}): Promise<void> => {
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: "You're on the list 🎉 — VIBO Mumbai",
    html: `
      <p>You're <strong>#${params.position}</strong> in line for VIBO Mumbai.</p>
      <p>We'll send one email when the app goes live — nothing until then.</p>
      <br/>
      <p>Want to move up? Share your link:</p>
      <p><strong>https://vibo.in?ref=${params.referralCode}</strong></p>
      <p>Every person who joins through your link bumps you higher.</p>
      <br/>
      <p style="color:#999;font-size:12px">
        You're receiving this because you signed up at vibo.in.
      </p>
    `,
  });
};

export const sendCityLaunch = async (params: {
  to: string;
  city: string;
  customMessage?: string;
}): Promise<void> => {
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `VIBO is live in ${params.city} 🚀`,
    html:
      params.customMessage ??
      `
      <p>It's happening.</p>
      <p>VIBO is live in <strong>${params.city}</strong> right now.</p>
      <br/>
      <p>Download the app and sign up with this email address to unlock your early access.</p>
      <br/>
      <a href="https://apps.apple.com/app/vibo" style="margin-right:12px">App Store</a>
      <a href="https://play.google.com/store/apps/vibo">Google Play</a>
      <br/><br/>
      <p style="color:#999;font-size:12px">
        You're receiving this because you joined the VIBO waitlist.
      </p>
    `,
  });
};

export const sendReferralMilestone = async (params: {
  to: string;
  referralCode: string;
  count: number;
}): Promise<void> => {
  await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `${params.count} people joined because of you 👀`,
    html: `
      <p>You've brought <strong>${params.count} people</strong> onto the VIBO waitlist.</p>
      <p>That makes you one of our top referrers in Mumbai.</p>
      <br/>
      <p>People who helped build the list get first access when we launch.</p>
      <p>Keep sharing: <strong>https://vibo.in?ref=${params.referralCode}</strong></p>
    `,
  });
};