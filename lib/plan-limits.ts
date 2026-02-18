// ============================================================
// BookFlow — Free tier plan limits
// ============================================================

export const FREE_TIER = {
  maxBusinesses: 1,
  maxServices: 2,
  maxStaff: 1,
  /** WhatsApp trial period in days for free tier users */
  whatsappTrialDays: 3,
} as const;

/** Trial and starter are treated as free tier for limits */
export function isFreeTier(tier: string | null | undefined): boolean {
  if (!tier) return true;
  const t = tier.toLowerCase();
  return t === "trial" || t === "starter";
}

/**
 * Check if a business is within the WhatsApp trial period (free tier only)
 * @param createdAt - Business creation date (ISO string or Date)
 * @param tier - Business subscription tier
 * @returns true if business is in trial period and can use WhatsApp
 */
export function isInWhatsAppTrial(createdAt: string | Date | null | undefined, tier: string | null | undefined): boolean {
  if (!isFreeTier(tier)) {
    // Pro/paid users always have WhatsApp access
    return true;
  }
  
  if (!createdAt) {
    // If no creation date, assume trial expired (conservative)
    return false;
  }
  
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const now = new Date();
  const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysSinceCreation < FREE_TIER.whatsappTrialDays;
}
