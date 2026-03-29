import crypto from 'node:crypto';

// Generates a short readable code from the email prefix + random suffix.
// e.g. email "aarav.kumar@gmail.com" → "AARAV4KX"
export const generateReferralCode = (email: string): string => {
  const prefix = email
    .split('@')[0]
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 5)
    .toUpperCase();

  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}${suffix}`;
};