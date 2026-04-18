import { apiFetch, getToken } from "@/lib/api";

export type UpgradePrefetchInv = {
  itemId: string;
  name: string;
  image?: string;
  rarity?: string;
  sellPrice: number;
  marketPriceRub?: number | null;
  withdrawalPending?: boolean;
  caseSlug?: string;
};

export type UpgradePrefetchCat = {
  id: string;
  name: string;
  price: number;
  rarity: string;
  image: string | null;
};

type CacheEntry = {
  inventory: UpgradePrefetchInv[];
  balance: number;
  catalog: UpgradePrefetchCat[];
  at: number;
};

let cache: CacheEntry | null = null;
const TTL_MS = 45_000;
let inFlight: Promise<void> | null = null;

function clearUpgradeBootstrapCache() {
  cache = null;
  inFlight = null;
}

if (typeof window !== "undefined") {
  const onInvalidate = () => clearUpgradeBootstrapCache();
  window.addEventListener("cd-balance-updated", onInvalidate);
  window.addEventListener("cd-cases-updated", onInvalidate);
}

/** Дані для миттєвого відображення на /upgrade, якщо свіжі (після prefetch або попереднього візиту). */
export function peekUpgradeBootstrapCache(): Omit<CacheEntry, "at"> | null {
  if (!cache || Date.now() - cache.at > TTL_MS) return null;
  return {
    inventory: cache.inventory,
    balance: cache.balance,
    catalog: cache.catalog,
  };
}

export function writeUpgradeBootstrapCache(entry: Omit<CacheEntry, "at">) {
  cache = { ...entry, at: Date.now() };
}

/**
 * Виклик з навігації (hover / focus) — паралельно тягне /api/me та /api/upgrade/catalog.
 */
export function prefetchUpgradePageData() {
  if (typeof window === "undefined") return;
  if (!getToken()) return;
  if (cache && Date.now() - cache.at < TTL_MS / 2) return;
  if (inFlight) return;
  inFlight = (async () => {
    try {
      const [meR, catR] = await Promise.all([
        apiFetch<{ inventory: UpgradePrefetchInv[]; balance: number }>("/api/me"),
        apiFetch<{ items: UpgradePrefetchCat[] }>("/api/upgrade/catalog"),
      ]);
      if (meR.ok && meR.data && catR.ok && catR.data && Array.isArray(catR.data.items)) {
        writeUpgradeBootstrapCache({
          inventory: Array.isArray(meR.data.inventory) ? meR.data.inventory : [],
          balance: Number(meR.data.balance) || 0,
          catalog: catR.data.items,
        });
      }
    } finally {
      inFlight = null;
    }
  })();
}
