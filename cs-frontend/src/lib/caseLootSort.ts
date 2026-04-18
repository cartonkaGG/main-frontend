/** Вище число — рідкісніший / «золотіші» слоти; сірий кінець списку. */
const RARITY_RANK: Record<string, number> = {
  contraband: 14,
  extraordinary: 13,
  legendary: 12,
  covert: 11,
  classified: 10,
  epic: 9,
  restricted: 8,
  rare: 7,
  milspec: 6,
  "mil-spec": 6,
  uncommon: 5,
  industrial: 4,
  consumer: 3,
  common: 2,
};

function normRarityKey(raw: string): string {
  const r = (raw || "common").toLowerCase().trim().replace(/\s+/g, "-");
  if (r === "mil_spec") return "mil-spec";
  return r;
}

export function sortLootGoldToGray<T extends { rarity: string; sellPrice: number }>(
  items: T[],
): T[] {
  const rank = (r: string) => RARITY_RANK[normRarityKey(r)] ?? 0;
  return [...items].sort((a, b) => {
    const d = rank(b.rarity) - rank(a.rarity);
    if (d !== 0) return d;
    return b.sellPrice - a.sellPrice;
  });
}
