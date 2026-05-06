export const SUPPORT_TIERS = ['community', 'standard', 'premium', 'enterprise'] as const
export type SupportTier = typeof SUPPORT_TIERS[number]
