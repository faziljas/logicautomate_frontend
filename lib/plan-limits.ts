// ============================================================
// BookFlow — Free tier plan limits
// ============================================================

export const FREE_TIER = {
  maxBusinesses: 1,
  maxServices: 2,
  maxStaff: 1,
} as const;

/** Trial and starter are treated as free tier for limits */
export function isFreeTier(tier: string | null | undefined): boolean {
  if (!tier) return true;
  const t = tier.toLowerCase();
  return t === "trial" || t === "starter";
}
