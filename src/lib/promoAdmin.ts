export type AdminPromo = {
  id: string;
  code: string;
  active: boolean;
  featured: boolean;
  rewardType: "balance" | "depositPct";
  bonusPercent: number;
  percentBaseRub: number;
  extraFlatRub: number;
  expiresAt: string | null;
  maxUsesGlobal: number | null;
  maxUsesPerUser: number;
  usedCount: number;
  bannerSubline: string;
  computedGrant?: number;
  computedDepositPercent?: number;
};
