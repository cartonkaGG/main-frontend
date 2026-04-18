import { normRarity, rarityCardFill } from "@/components/CaseRoulette";

/** Бордери карток сітки апгрейду (узгоджено з `src/app/upgrade/page.tsx`). */
export const RARITY_CARD_BORDER_GRID: Record<string, string> = {
  common: "border-zinc-500/55",
  uncommon: "border-sky-400/55",
  rare: "border-blue-500/50",
  epic: "border-fuchsia-500/50",
  legendary: "border-amber-400/55",
  consumer: "border-zinc-400/50",
  industrial: "border-slate-400/50",
  milspec: "border-blue-500/50",
  "mil-spec": "border-blue-500/50",
  restricted: "border-violet-500/50",
  classified: "border-fuchsia-500/50",
  covert: "border-red-600/55",
  extraordinary: "border-amber-400/55",
  contraband: "border-orange-500/55",
};

const RARITY_UPGRADE_NEON_OUTER: Record<string, string> = {
  common:
    "shadow-[0_0_8px_rgba(161,161,170,0.22),0_0_18px_rgba(113,113,122,0.14),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  uncommon:
    "shadow-[0_0_9px_rgba(56,189,248,0.26),0_0_20px_rgba(14,165,233,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  rare: "shadow-[0_0_9px_rgba(59,130,246,0.26),0_0_20px_rgba(37,99,235,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  epic: "shadow-[0_0_9px_rgba(217,70,239,0.26),0_0_20px_rgba(192,38,211,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  legendary:
    "shadow-[0_0_9px_rgba(251,191,36,0.26),0_0_20px_rgba(245,158,11,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  consumer:
    "shadow-[0_0_8px_rgba(161,161,170,0.2),0_0_18px_rgba(113,113,122,0.12),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  industrial:
    "shadow-[0_0_8px_rgba(148,163,184,0.22),0_0_19px_rgba(100,116,139,0.13),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  milspec:
    "shadow-[0_0_9px_rgba(59,130,246,0.26),0_0_20px_rgba(37,99,235,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  "mil-spec":
    "shadow-[0_0_9px_rgba(59,130,246,0.26),0_0_20px_rgba(37,99,235,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  restricted:
    "shadow-[0_0_9px_rgba(139,92,246,0.26),0_0_20px_rgba(124,58,237,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  classified:
    "shadow-[0_0_9px_rgba(217,70,239,0.26),0_0_20px_rgba(192,38,211,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  covert:
    "shadow-[0_0_10px_rgba(239,68,68,0.28),0_0_22px_rgba(220,38,38,0.16),inset_0_0_0_1px_rgba(255,255,255,0.045)]",
  extraordinary:
    "shadow-[0_0_9px_rgba(251,191,36,0.28),0_0_22px_rgba(234,179,8,0.16),inset_0_0_0_1px_rgba(255,255,255,0.045)]",
  contraband:
    "shadow-[0_0_9px_rgba(249,115,22,0.26),0_0_20px_rgba(234,88,12,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
};

export const RARITY_UPGRADE_IMAGE_GLOW: Record<string, string> = {
  common: "bg-zinc-500/50",
  uncommon: "bg-sky-400/50",
  rare: "bg-blue-500/50",
  epic: "bg-fuchsia-500/50",
  legendary: "bg-amber-400/50",
  consumer: "bg-zinc-400/50",
  industrial: "bg-slate-400/50",
  milspec: "bg-blue-500/50",
  "mil-spec": "bg-blue-500/50",
  restricted: "bg-violet-500/50",
  classified: "bg-fuchsia-500/50",
  covert: "bg-red-600/50",
  extraordinary: "bg-amber-400/50",
  contraband: "bg-orange-500/50",
};

export function resolveUpgradeRarityKey(r: string): string {
  let rk = normRarity(r);
  if (!(rk in rarityCardFill)) {
    const k = String(r || "").toLowerCase();
    if (k.includes("extraordinary")) rk = "extraordinary";
    else if (k.includes("contraband")) rk = "contraband";
    else if (k.includes("covert")) rk = "covert";
    else if (k.includes("classified")) rk = "classified";
    else if (k.includes("restricted")) rk = "restricted";
    else if (k.includes("legendary")) rk = "legendary";
    else if (k.includes("uncommon")) rk = "uncommon";
    else if (k.includes("milspec") || k.includes("mil-spec") || k.includes("mil spec")) rk = "milspec";
    else if (k.includes("industrial")) rk = "industrial";
    else if (k.includes("consumer")) rk = "consumer";
    else if (k.includes("epic")) rk = "epic";
    else if (k.includes("rare")) rk = "rare";
    else rk = "common";
  }
  return rk;
}

/** Поверхня картки як у сітці інвентаря на сторінці апгрейду. */
export function rarityCardSurfaceUpgradeGrid(r: string) {
  const rk = resolveUpgradeRarityKey(r);
  const line = RARITY_CARD_BORDER_GRID[rk] || RARITY_CARD_BORDER_GRID.common;
  const neon = RARITY_UPGRADE_NEON_OUTER[rk] || RARITY_UPGRADE_NEON_OUTER.common;
  return `${line} bg-black/25 ${neon}`;
}
