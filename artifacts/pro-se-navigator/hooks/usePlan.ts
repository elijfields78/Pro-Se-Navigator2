/**
 * Plan hook — returns the user's current subscription tier.
 * Hardcoded to 'free' until Stripe is wired in (Phase 14).
 *
 * Tiers:
 *   free  — image & camera (3 uploads/day), file upload locked
 *   pro   — image, camera, file (unlimited)
 *   max   — everything in pro + future premium features
 */
export type PlanTier = 'free' | 'pro' | 'max';

export interface PlanInfo {
  tier: PlanTier;
  uploadsUsedToday: number;
  uploadLimitPerDay: number | null; // null = unlimited
  canUploadImage: boolean;
  canUseCamera: boolean;
  canUploadFile: boolean;
}

export function usePlan(): PlanInfo {
  // TODO Phase 14: read from Stripe entitlements / user profile
  const tier: PlanTier = 'free';

  return {
    tier,
    uploadsUsedToday: 0,
    uploadLimitPerDay: tier === 'free' ? 3 : null,
    canUploadImage: true,           // all tiers
    canUseCamera: true,             // all tiers
    canUploadFile: tier !== 'free', // pro & max only
  };
}
