import type { AppConfigSnapshot } from '../app-config/appConfig.service';

export type WaitlistTier = 'tier1' | 'tier2' | null;

export type PaidHostingResolution = {
  /** Sparks to debit for this paid listing (0 = waived welcome slot or unlimited). */
  sparkCost: number;
  /** If true, increment `spark_welcome_paid_hostings_used` after the event row is inserted. */
  consumeWelcomePaidSlot: boolean;
  /** For transaction metadata / support. */
  pricingReason:
    | 'free_event'
    | 'unlimited_hosting_promo'
    | 'waitlist_tier1_discount'
    | 'welcome_paid_waiver'
    | 'standard_paid';
};

export type HostingCostHostContext = {
  waitlistTier: WaitlistTier;
  waitlistHostingDiscountUntil: Date | null;
  sparkWelcomePaidHostingsUsed: number;
};

/**
 * Resolves spark cost for creating a **paid** listing (caller passes isFree already false).
 * Free events and global unlimited promos should be handled by the caller (sparkCost 0).
 */
export const resolvePaidListingSparkCost = (
  host: HostingCostHostContext,
  config: AppConfigSnapshot,
  now: Date
): PaidHostingResolution => {
  const standard = Math.max(0, Math.floor(config.paidEventHostSparkCost));
  const tier1Rate = Math.max(0, Math.floor(config.waitlistTier1HostingSparkCost));
  const welcomeCap = Math.max(0, Math.floor(config.welcomeFreePaidHostingsCount));

  const discountEnd = host.waitlistHostingDiscountUntil;
  const inTier1DiscountWindow =
    host.waitlistTier === 'tier1' &&
    discountEnd !== null &&
    !Number.isNaN(discountEnd.getTime()) &&
    now < discountEnd;

  if (inTier1DiscountWindow) {
    return {
      sparkCost: tier1Rate,
      consumeWelcomePaidSlot: false,
      pricingReason: 'waitlist_tier1_discount',
    };
  }

  if (welcomeCap > 0 && host.sparkWelcomePaidHostingsUsed < welcomeCap) {
    return {
      sparkCost: 0,
      consumeWelcomePaidSlot: true,
      pricingReason: 'welcome_paid_waiver',
    };
  }

  return {
    sparkCost: standard,
    consumeWelcomePaidSlot: false,
    pricingReason: 'standard_paid',
  };
};

export const buildPaidHostingInsufficientMessage = (
  required: number,
  pricingReason: PaidHostingResolution['pricingReason']
): string => {
  if (pricingReason === 'waitlist_tier1_discount') {
    return `You need ${required} Sparks to host this paid event (waitlist discounted rate). Top up Sparks or create a free event.`;
  }
  if (pricingReason === 'standard_paid') {
    return `You need ${required} Sparks to host this paid event. Top up Sparks, create a free event, or use a welcome free paid slot if you still have one.`;
  }
  return 'Not enough Sparks for this action.';
};
