"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { normRarity, rarityCardFill } from "@/components/CaseRoulette";
import { SiteShell } from "@/components/SiteShell";
import { apiFetch, getToken } from "@/lib/api";
import { formatRub } from "@/lib/money";
import { requestAuthModal } from "@/lib/authModal";

type InvItem = {
  itemId: string;
  name: string;
  image?: string;
  rarity?: string;
  sellPrice: number;
  caseSlug?: string;
};

type CatalogItem = {
  id: string;
  name: string;
  price: number;
  rarity: string;
  image: string | null;
};

/** Зведення взносу — «HUD» блок без гучних градієнтів */
const UPGRADE_SUMMARY_BOX =
  "mx-auto mb-3 w-full max-w-[280px] rounded-xl border border-zinc-700/40 bg-gradient-to-b from-zinc-900/85 via-zinc-950/80 to-black/75 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.35)] sm:max-w-xs";
const UPGRADE_SUMMARY_ROW = "flex items-center justify-between gap-3 py-1.5";
const UPGRADE_SUMMARY_LABEL = "text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500";
const UPGRADE_SUMMARY_VALUE =
  "text-right font-mono text-[13px] font-bold tabular-nums text-emerald-400/95 [text-shadow:0_0_18px_rgba(52,211,153,0.15)] sm:text-sm";
const UPGRADE_SUMMARY_VALUE_MUTED = "text-right font-mono text-xs font-semibold tabular-nums text-cyan-400/90";

/** Ціна на картці інвентаря / каталогу */
const UPGRADE_PRICE_CHIP =
  "mt-0.5 flex w-full items-center justify-center rounded-md border border-zinc-600/45 bg-black/50 py-1 px-1.5 font-mono text-[9px] font-semibold tabular-nums text-emerald-300/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:text-[10px]";
const UPGRADE_PRICE_CHIP_INLINE =
  "flex w-full items-center justify-center rounded-md border border-zinc-600/45 bg-black/50 py-1 px-1.5 font-mono text-[9px] font-semibold tabular-nums text-emerald-300/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:text-[10px]";

/** Мітка біля слайдера балансу */
const UPGRADE_BOOST_BADGE =
  "inline-flex shrink-0 items-center rounded-md border border-cyan-500/25 bg-cyan-950/20 px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-cyan-300/95";

/** Ціна обраної цілі */
const UPGRADE_TARGET_PRICE_WRAP =
  "mt-2 flex flex-col items-center gap-1 rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-950/35 via-black/50 to-black/70 px-4 py-2.5 shadow-[0_0_28px_rgba(245,158,11,0.07),inset_0_1px_0_rgba(255,255,255,0.05)]";
const UPGRADE_TARGET_PRICE_LABEL = "text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-200/45";
const UPGRADE_TARGET_PRICE_ROW = "flex items-baseline justify-center gap-1";
const UPGRADE_TARGET_PRICE_NUM =
  "font-mono text-lg font-bold tabular-nums text-amber-100 sm:text-xl";
const UPGRADE_TARGET_PRICE_CUR = "text-sm font-medium text-amber-500/75";

const RARITY_CARD_BORDER: Record<string, string> = {
  common: "border-zinc-500/55",
  uncommon: "border-emerald-500/50",
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

/** Те саме залиття, що й картки рулетки кейсу + бордер. Fallback для дивних рядків з API. */
function rarityCardSurface(r: string) {
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
  const fill = rarityCardFill[rk] || rarityCardFill.common;
  const line = RARITY_CARD_BORDER[rk] || RARITY_CARD_BORDER.common;
  return `${line} ${fill}`;
}

function rarityTint(r: string) {
  const k = String(r || "common").toLowerCase();
  if (k.includes("covert")) return "from-red-950/55 via-cb-panel/90 to-cb-void";
  if (k.includes("classified")) return "from-fuchsia-950/45 via-cb-panel/90 to-cb-void";
  if (k.includes("restricted")) return "from-violet-950/40 via-cb-panel/90 to-cb-void";
  if (k.includes("legendary")) return "from-amber-950/35 via-cb-panel/90 to-cb-void";
  return "from-zinc-950/80 via-cb-panel to-cb-void";
}

function pickTargetNearPrice(catalog: CatalogItem[], inputSum: number, targetPrice: number): string | null {
  if (inputSum <= 0 || !Number.isFinite(targetPrice)) return null;
  const cands = catalog.filter((t) => t.price > inputSum);
  if (!cands.length) return null;
  const best = cands.reduce((a, t) =>
    Math.abs(t.price - targetPrice) < Math.abs(a.price - targetPrice) ? t : a,
  cands[0]);
  return best.id;
}

/** Коло: червоний сегмент = показаний шанс (номінал). */
const GAUGE_R = 36;
const GAUGE_C = 2 * Math.PI * GAUGE_R;

/** Тривалість обертання стрілки після апгрейду (CSS transition і setTimeout мають збігатися). */
const UPGRADE_SPIN_DURATION_MS = 6500;
const UPGRADE_SPIN_DURATION_SEC = UPGRADE_SPIN_DURATION_MS / 1000;

/**
 * Сервер: win ⟺ roll < pWin. На колі червона займає перші nominalN оберту (0…nominalN).
 * Кут стрілки такий, що вона в червоному сегменті ⟺ виграш, і рівномірно в межах сегмента/між сегментами.
 */
function rollToGaugeLandDegrees(roll: number, pWin: number, nominalN: number): number {
  const p = Math.min(1, Math.max(0, pWin));
  const n = Math.min(1, Math.max(0, nominalN));
  if (roll < p) {
    if (p <= 0) return 0;
    return (roll / p) * n * 360;
  }
  if (p >= 1) return n * 360;
  const u = (roll - p) / (1 - p);
  return (n + u * (1 - n)) * 360;
}

function UpgradeGauge({
  effectiveChancePct,
  displayChancePct,
  roll,
  spinning,
  spinKey,
  done,
}: {
  /** pWin після RTP/лімітів — для відповідності roll ↔ виграш */
  effectiveChancePct: number;
  /** Показаний шанс — довжина червоної дуги й підпис */
  displayChancePct: number;
  roll: number | null;
  spinning: boolean;
  spinKey: number;
  done: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const gradId = `ug-grad-${uid}`;
  const glowId = `ug-glow-${uid}`;
  const pWin = Math.min(100, Math.max(0, effectiveChancePct)) / 100;
  const n = Math.min(100, Math.max(0, displayChancePct)) / 100;
  const progressLen = n * GAUGE_C;
  const land =
    roll == null ? 0 : rollToGaugeLandDegrees(roll, pWin, n);
  const targetRot = 4 * 360 + land;
  const [rot, setRot] = useState(0);

  useEffect(() => {
    if (spinning) {
      setRot(0);
      const id = window.setTimeout(() => setRot(targetRot), 60);
      return () => clearTimeout(id);
    }
    if (done && roll != null) setRot(targetRot);
    else setRot(0);
  }, [spinning, spinKey, done, roll, targetRot]);

  const dashTransition = "stroke-dasharray 0.55s cubic-bezier(0.33, 1, 0.68, 1)";

  return (
    <div className="relative mx-auto flex w-full max-w-[300px] flex-col items-center sm:max-w-[320px]">
      <div className="relative aspect-square w-full">
        <div
          className="pointer-events-none absolute inset-[6%] rounded-full bg-red-500/20 blur-2xl"
          aria-hidden
        />
        <svg className="relative z-[1] h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="40%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx="50"
            cy="50"
            r={GAUGE_R}
            fill="none"
            stroke="rgba(15,10,12,0.95)"
            strokeWidth="10"
          />
          <circle
            cx="50"
            cy="50"
            r={GAUGE_R}
            fill="none"
            stroke="rgba(55,25,30,0.85)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={GAUGE_R}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${progressLen} ${GAUGE_C}`}
            filter={`url(#${glowId})`}
            style={{ transition: dashTransition }}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 z-[2] text-[10px] font-bold tracking-tight text-zinc-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          <span className="absolute left-1/2 top-[3%] -translate-x-1/2">0%</span>
          <span className="absolute right-[4%] top-1/2 -translate-y-1/2">25%</span>
          <span className="absolute bottom-[3%] left-1/2 -translate-x-1/2">50%</span>
          <span className="absolute left-[4%] top-1/2 -translate-y-1/2">75%</span>
        </div>
        <div
          key={spinKey}
          className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center"
          style={{
            transform: `rotate(${rot}deg)`,
            transition: spinning
              ? `transform ${UPGRADE_SPIN_DURATION_SEC}s cubic-bezier(0.12, 0.85, 0.15, 1)`
              : "transform 0.35s ease-out",
          }}
        >
          <div className="absolute top-[8%] flex h-[34%] w-2 items-end justify-center sm:w-2.5">
            <div className="h-full w-full rounded-full bg-gradient-to-b from-white via-red-200 to-cb-flame shadow-[0_0_14px_rgba(255,70,70,0.95)] ring-1 ring-white/30" />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
          <div className="rounded-2xl border-2 border-cb-flame/35 bg-black/70 px-3 py-1.5 shadow-[0_0_24px_rgba(220,38,38,0.25)] backdrop-blur-sm sm:px-3.5 sm:py-2">
            <span className="block text-center text-[8px] font-bold uppercase tracking-wider text-zinc-500">
              Шанс
            </span>
            <span className="font-mono text-base font-black tabular-nums text-cb-flame sm:text-lg">
              {displayChancePct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Дублюємо прогрес лінійно — найкраще видно заповнення */}
      <div className="mt-4 w-full max-w-[280px] px-0.5 sm:max-w-[300px]">
        <div className="mb-1 text-[10px] text-zinc-500">
          <span>Зона виграшу</span>
        </div>
        <div
          className="relative h-4 w-full overflow-hidden rounded-full border border-cb-stroke/70 bg-zinc-950/95 shadow-inner"
          role="progressbar"
          aria-valuenow={Math.round(Math.min(100, Math.max(0, displayChancePct)) * 10) / 10}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-950 via-red-500 to-amber-400 shadow-[0_0_12px_rgba(239,68,68,0.45)] transition-[width] duration-500 ease-out"
            style={{ width: `${n * 100}%` }}
          />
          {n >= 0.12 ? (
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-wide text-white/90 drop-shadow-md">
              зона виграшу
            </span>
          ) : null}
        </div>
      </div>

      {done && roll != null ? (
        <p className="mt-3 text-center text-[11px] text-zinc-500">
          бросок {(roll * 100).toFixed(2)}% · шанс {displayChancePct.toFixed(2)}%
        </p>
      ) : null}
    </div>
  );
}

const panelClass =
  "rounded-2xl border border-cb-stroke/90 bg-gradient-to-br from-black/50 via-cb-panel/95 to-zinc-950 shadow-[inset_0_1px_0_rgba(255,49,49,0.08)]";

export default function UpgradePage() {
  const [inventory, setInventory] = useState<InvItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetId, setTargetId] = useState<string>("");
  const [chancePct, setChancePct] = useState<number>(0);
  const [nominalPct, setNominalPct] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [showResult, setShowResult] = useState<"win" | "loss" | null>(null);
  const [lastOutcomeName, setLastOutcomeName] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [gridView, setGridView] = useState(true);
  const [balanceBoostPct, setBalanceBoostPct] = useState(0);
  const [previewMeta, setPreviewMeta] = useState<{
    nominalRawPct: number;
    cappedChance: boolean;
    maxChancePct: number;
  } | null>(null);
  /** null = немає фільтра з сервера (гість / нема вибору); масив з API — лише дозволені номіналом цілі */
  const [eligibleItems, setEligibleItems] = useState<CatalogItem[] | null>(null);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const eligibleFetchGen = useRef(0);

  const loadAll = useCallback(async () => {
    if (!getToken()) {
      setInventory([]);
      setBalance(0);
      return;
    }
    const [meR, catR] = await Promise.all([
      apiFetch<{ inventory: InvItem[]; balance: number }>("/api/me"),
      apiFetch<{ items: CatalogItem[] }>("/api/upgrade/catalog"),
    ]);
    if (meR.ok && meR.data) {
      setInventory(Array.isArray(meR.data.inventory) ? meR.data.inventory : []);
      setBalance(Number(meR.data.balance) || 0);
    }
    if (catR.ok && catR.data?.items) setCatalog(catR.data.items);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const inputSum = useMemo(() => {
    let s = 0;
    selected.forEach((id) => {
      const it = inventory.find((x) => x.itemId === id);
      if (it) s += Number(it.sellPrice) || 0;
    });
    return s;
  }, [selected, inventory]);

  const balanceBoostRub = useMemo(() => {
    const b = Number(balance) || 0;
    const p = Math.min(100, Math.max(0, Number(balanceBoostPct) || 0));
    if (b <= 0 || p <= 0) return 0;
    return Math.min(b, Math.floor((b * p) / 100));
  }, [balance, balanceBoostPct]);

  const stakeTotal = useMemo(() => inputSum + balanceBoostRub, [inputSum, balanceBoostRub]);

  const useServerEligible = selected.size >= 1 && stakeTotal > 0 && Boolean(getToken());

  const targetPool = useMemo(() => {
    if (!useServerEligible) {
      return catalog;
    }
    if (eligibleItems !== null) {
      return eligibleItems;
    }
    if (eligibleLoading) {
      return [];
    }
    return catalog.filter((t) => t.price > stakeTotal);
  }, [catalog, eligibleItems, eligibleLoading, stakeTotal, useServerEligible]);

  const validTargets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minP = priceMin === "" ? null : Number(priceMin);
    const maxP = priceMax === "" ? null : Number(priceMax);
    return targetPool.filter((t) => {
      if (t.price <= stakeTotal) return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      if (minP != null && Number.isFinite(minP) && t.price < minP) return false;
      if (maxP != null && Number.isFinite(maxP) && t.price > maxP) return false;
      return true;
    });
  }, [targetPool, stakeTotal, search, priceMin, priceMax]);

  useEffect(() => {
    if (!useServerEligible) {
      setEligibleItems(null);
      setEligibleLoading(false);
      return;
    }
    eligibleFetchGen.current += 1;
    const gen = eligibleFetchGen.current;
    setEligibleLoading(true);
    setEligibleItems(null);
    const inputItemIds = Array.from(selected);
    const boost = balanceBoostPct;
    const t = window.setTimeout(() => {
      void (async () => {
        const r = await apiFetch<{ items: CatalogItem[] }>("/api/upgrade/eligible-targets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inputItemIds,
            balanceBoostPct: boost,
          }),
        });
        if (gen !== eligibleFetchGen.current) return;
        setEligibleLoading(false);
        if (r.ok && r.data && Array.isArray(r.data.items)) {
          setEligibleItems(r.data.items);
        } else {
          setEligibleItems(null);
        }
      })();
    }, 320);
    return () => clearTimeout(t);
  }, [useServerEligible, selected, stakeTotal, balanceBoostPct]);

  useEffect(() => {
    if (spinning) return;
    if (!targetId || !validTargets.some((t) => t.id === targetId)) {
      setTargetId(validTargets[0]?.id || "");
    }
  }, [validTargets, targetId, spinning]);

  const refreshPreview = useCallback(async () => {
    if (!getToken() || selected.size < 1 || !targetId) {
      setChancePct(0);
      setNominalPct(0);
      setPreviewMeta(null);
      return;
    }
    const r = await apiFetch<{
      chancePct: number;
      targetRtpPct: number;
      nominalPct: number;
      nominalRawPct?: number;
      serverBalance?: number;
      limits?: {
        minPct: number;
        maxPct: number;
        cappedChanceByMax?: boolean;
      };
    }>("/api/upgrade/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputItemIds: Array.from(selected),
        targetId,
        balanceBoostPct,
      }),
    });
    if (r.ok && r.data) {
      setChancePct(r.data.chancePct);
      setNominalPct(r.data.nominalPct);
      if (typeof r.data.serverBalance === "number" && Number.isFinite(r.data.serverBalance)) {
        setBalance(r.data.serverBalance);
      }
      const lim = r.data.limits;
      const raw = r.data.nominalRawPct;
      if (
        lim != null &&
        typeof raw === "number" &&
        Number.isFinite(lim.maxPct) &&
        Number.isFinite(raw)
      ) {
        setPreviewMeta({
          nominalRawPct: raw,
          cappedChance: Boolean(lim.cappedChanceByMax),
          maxChancePct: lim.maxPct,
        });
      } else {
        setPreviewMeta(null);
      }
      setErr(null);
    } else {
      setChancePct(0);
      setNominalPct(0);
      setPreviewMeta(null);
      setErr(r.error || null);
    }
  }, [selected, targetId, balanceBoostPct]);

  useEffect(() => {
    const t = setTimeout(() => void refreshPreview(), 320);
    return () => clearTimeout(t);
  }, [refreshPreview]);

  function toggleSel(id: string) {
    if (spinning) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 6) next.add(id);
      return next;
    });
    setShowResult(null);
    setLastRoll(null);
  }

  function applyQuickPick(kind: "x2" | "x5" | "x10" | "p30" | "p50" | "p75" | "shuffle") {
    if (spinning || inputSum <= 0) return;
    const pool = targetPool.filter((t) => t.price > stakeTotal);
    let id: string | null = null;
    if (kind === "shuffle") {
      if (pool.length) id = pool[Math.floor(Math.random() * pool.length)]!.id;
    } else if (kind === "x2") id = pickTargetNearPrice(pool, stakeTotal, stakeTotal * 2);
    else if (kind === "x5") id = pickTargetNearPrice(pool, stakeTotal, stakeTotal * 5);
    else if (kind === "x10") id = pickTargetNearPrice(pool, stakeTotal, stakeTotal * 10);
    else if (kind === "p30") id = pickTargetNearPrice(pool, stakeTotal, stakeTotal / 0.3);
    else if (kind === "p50") id = pickTargetNearPrice(pool, stakeTotal, stakeTotal / 0.5);
    else if (kind === "p75") id = pickTargetNearPrice(pool, stakeTotal, stakeTotal / 0.75);
    if (id) {
      setTargetId(id);
      setShowResult(null);
      setLastRoll(null);
    }
  }

  async function runUpgrade() {
    if (!getToken()) {
      requestAuthModal("/upgrade");
      return;
    }
    setErr(null);
    setBusy(true);
    setShowResult(null);
    setLastRoll(null);
    setLastOutcomeName(null);
    const r = await apiFetch<{
      win: boolean;
      chancePct: number;
      nominalPct?: number;
      roll: number;
      target?: { name: string };
    }>("/api/upgrade/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputItemIds: Array.from(selected),
        targetId,
        balanceBoostPct,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      setErr(r.error || "Ошибка");
      return;
    }
    const data = r.data!;
    setLastOutcomeName(data.win && data.target?.name ? data.target.name : null);
    setSpinKey((k) => k + 1);
    setLastRoll(data.roll);
    setChancePct(data.chancePct);
    if (typeof data.nominalPct === "number" && Number.isFinite(data.nominalPct)) {
      setNominalPct(data.nominalPct);
    }
    setSpinning(true);
    window.setTimeout(() => {
      setSpinning(false);
      setShowResult(data.win ? "win" : "loss");
      setSelected(new Set());
      setTargetId("");
      setBalanceBoostPct(0);
      void loadAll();
      window.dispatchEvent(new CustomEvent("cd-balance-updated"));
    }, UPGRADE_SPIN_DURATION_MS);
  }

  const target = catalog.find((t) => t.id === targetId);
  const selectedItems = useMemo(
    () => inventory.filter((i) => selected.has(i.itemId)),
    [inventory, selected],
  );

  const quickBtn =
    "rounded-lg border border-cb-stroke/80 bg-black/40 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:border-cb-flame/45 hover:text-cb-flame";

  return (
    <SiteShell>
      <div className="min-h-[calc(100dvh-52px)] bg-cb-void text-zinc-200">
        <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5">
          {err ? (
            <p className="mb-4 rounded-lg border border-red-500/35 bg-red-950/25 px-3 py-2 text-sm text-red-300">{err}</p>
          ) : null}

          {/* Верх: 3 колонки */}
          <div className="relative mb-6 rounded-2xl border border-cb-stroke/80 bg-cb-panel/80 bg-cb-mesh p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-5">
            <div className="grid grid-cols-1 gap-5 pt-2 xl:grid-cols-[1fr_minmax(260px,320px)_1fr] xl:items-stretch xl:gap-6">
              {/* Слева: вклад */}
              <div className={`flex flex-col ${panelClass} p-4`}>
                <h3 className="mb-2 text-center text-[12px] font-bold uppercase tracking-wider text-zinc-500">
                  Выберите до 6 предметов для апгрейда
                </h3>
                <div className={UPGRADE_SUMMARY_BOX}>
                  {balanceBoostRub > 0 ? (
                    <>
                      <div className={`${UPGRADE_SUMMARY_ROW} border-b border-zinc-800/70 pb-2`}>
                        <span className={UPGRADE_SUMMARY_LABEL}>Предметы</span>
                        <span className={UPGRADE_SUMMARY_VALUE}>{formatRub(inputSum)} ₽</span>
                      </div>
                      <div className={`${UPGRADE_SUMMARY_ROW} border-b border-zinc-800/70`}>
                        <span className={UPGRADE_SUMMARY_LABEL}>Баланс</span>
                        <span className={UPGRADE_SUMMARY_VALUE_MUTED}>+{formatRub(balanceBoostRub)} ₽</span>
                      </div>
                    </>
                  ) : null}
                  <div
                    className={`flex items-start justify-between gap-3 ${balanceBoostRub > 0 ? "pt-2" : ""}`}
                  >
                    <div className="min-w-0 pt-0.5">
                      <div className={UPGRADE_SUMMARY_LABEL}>Всего в апгрейд</div>
                      {selected.size > 0 ? (
                        <p className="mt-0.5 text-[10px] text-zinc-600">{selected.size} шт.</p>
                      ) : null}
                    </div>
                    <span className={`${UPGRADE_SUMMARY_VALUE} text-base sm:text-[15px]`}>
                      {formatRub(stakeTotal)} ₽
                    </span>
                  </div>
                </div>
                <div className="flex min-h-[160px] flex-1 flex-wrap content-center justify-center gap-2 rounded-xl border border-dashed border-cb-stroke/60 bg-black/40 p-3">
                  {selectedItems.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-6 text-zinc-600">
                      <div className="text-4xl opacity-40">⌖</div>
                      <p className="text-center text-[11px]">Выберите предметы ниже</p>
                    </div>
                  ) : (
                    selectedItems.map((it) => (
                      <button
                        key={it.itemId}
                        type="button"
                        disabled={spinning}
                        onClick={() => toggleSel(it.itemId)}
                        className={`relative h-16 w-[4.5rem] overflow-hidden rounded-lg border ${rarityCardSurface(it.rarity || "common")} shadow-inner disabled:pointer-events-none disabled:opacity-45`}
                      >
                        {it.image ? (
                          <Image src={it.image} alt="" fill className="object-contain p-0.5" unoptimized />
                        ) : (
                          <span className="text-xs text-zinc-600">?</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
                <div className="mt-4 border-t border-cb-stroke/50 pt-3">
                  <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                    <span>Добавить баланс к шансу</span>
                    <span className={UPGRADE_BOOST_BADGE}>{formatRub(balanceBoostRub)} ₽</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={balanceBoostPct}
                    disabled={spinning}
                    onChange={(e) => setBalanceBoostPct(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-cb-stroke/80 accent-red-600 disabled:cursor-not-allowed disabled:opacity-45"
                  />
                  <p className="mt-1 text-[10px] text-zinc-600">
                    Списывается с баланса при апгрейде (до {formatRub(balance)} ₽). Увеличивает шанс так же, как
                    рост стоимости вклада.
                  </p>
                </div>
              </div>

              {/* Центр: индикатор + кнопка */}
              <div className="flex flex-col items-center justify-center gap-3">
                {nominalPct > 0 ? (
                  <div className="flex max-w-[280px] flex-col items-center gap-1 text-[11px] text-zinc-400">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span>
                        Шанс: <strong className="font-mono text-cb-flame">{nominalPct.toFixed(2)}%</strong>
                      </span>
                    </div>
                    {previewMeta?.cappedChance ? (
                      <p className="text-center text-[10px] leading-snug text-amber-400/90">
                        шанс на верхней границе ({previewMeta.maxChancePct.toFixed(0)}%): дополнительный баланс не увеличивает
                        показанный процент
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-center text-[11px] text-zinc-500">Выберите предметы и цель</p>
                )}
                <UpgradeGauge
                  effectiveChancePct={chancePct}
                  displayChancePct={nominalPct}
                  roll={lastRoll}
                  spinning={spinning}
                  spinKey={spinKey}
                  done={Boolean(showResult)}
                />
                {showResult === "win" ? (
                  <p className="max-w-[260px] text-center text-[12px] font-semibold leading-snug text-cb-flame">
                    Выигрыш!{lastOutcomeName ? ` ${lastOutcomeName}` : ""} добавлено в инвентарь.
                  </p>
                ) : showResult === "loss" ? (
                  <p className="text-center text-[12px] font-semibold text-red-500">Не удалось. Предметы потеряны.</p>
                ) : null}
                <button
                  type="button"
                  disabled={
                    busy || spinning || selected.size < 1 || !targetId || !validTargets.some((t) => t.id === targetId)
                  }
                  onClick={() => void runUpgrade()}
                  className="group flex w-full max-w-[260px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-800 to-cb-flame py-3.5 text-[13px] font-black uppercase tracking-widest text-white shadow-[0_10px_36px_rgba(255,49,49,0.35)] transition hover:brightness-110 disabled:opacity-40"
                >
                  <span className="text-lg leading-none">⇈</span>
                  {busy || spinning ? "…" : "Апгрейд"}
                </button>
              </div>

              {/* Справа: цель */}
              <div className={`flex flex-col ${panelClass} p-4`}>
                <h3 className="mb-3 text-center text-[12px] font-bold uppercase tracking-wider text-zinc-500">
                  Выберите оружие, которое хотите получить
                </h3>
                <div
                  className={`flex min-h-[160px] flex-1 items-center justify-center rounded-xl border border-dashed border-cb-stroke/60 bg-gradient-to-b ${target ? rarityTint(target.rarity) : "from-cb-panel to-black/80"}`}
                >
                  {target ? (
                    <div className="relative h-28 w-full max-w-[200px]">
                      {target.image ? (
                        <Image src={target.image} alt="" fill className="object-contain drop-shadow-lg" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-600">?</div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-8 text-zinc-600">
                      <div className="text-4xl opacity-40">◇</div>
                      <p className="text-[11px]">Цель появится здесь</p>
                    </div>
                  )}
                </div>
                {target ? (
                  <p className="mt-2 truncate text-center text-[12px] font-medium text-white">{target.name}</p>
                ) : null}
                {target ? (
                  <div className={UPGRADE_TARGET_PRICE_WRAP}>
                    <span className={UPGRADE_TARGET_PRICE_LABEL}>Цена цели</span>
                    <div className={UPGRADE_TARGET_PRICE_ROW}>
                      <span className={UPGRADE_TARGET_PRICE_NUM}>{formatRub(target.price)}</span>
                      <span className={UPGRADE_TARGET_PRICE_CUR}>₽</span>
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap justify-center gap-1.5 border-t border-cb-stroke/50 pt-3">
                  {(
                    [
                      ["x2", "x2"],
                      ["x5", "x5"],
                      ["x10", "x10"],
                      ["p30", "30%"],
                      ["p50", "50%"],
                      ["p75", "75%"],
                    ] as const
                  ).map(([k, lab]) => (
                    <button
                      key={k}
                      type="button"
                      disabled={spinning}
                      className={`${quickBtn} disabled:pointer-events-none disabled:opacity-40`}
                      onClick={() => applyQuickPick(k)}
                    >
                      {lab}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={spinning}
                    className={`${quickBtn} disabled:pointer-events-none disabled:opacity-40`}
                    onClick={() => applyQuickPick("shuffle")}
                    title="Случайная цель"
                  >
                    ⧈
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Низ: две панели */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={`${panelClass} flex flex-col p-4`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-bold text-white">
                  Мои предметы <span className="font-normal text-zinc-500">({inventory.length} шт.)</span>
                </h3>
                <div className="flex items-center gap-1 rounded-lg border border-cb-stroke/80 bg-black/50 p-0.5">
                  <button
                    type="button"
                    disabled={spinning}
                    onClick={() => setGridView(true)}
                    className={`rounded-md px-2 py-1 text-[11px] disabled:opacity-40 ${gridView ? "bg-red-600/30 text-cb-flame" : "text-zinc-500"}`}
                  >
                    ▦
                  </button>
                  <button
                    type="button"
                    disabled={spinning}
                    onClick={() => setGridView(false)}
                    className={`rounded-md px-2 py-1 text-[11px] disabled:opacity-40 ${!gridView ? "bg-red-600/30 text-cb-flame" : "text-zinc-500"}`}
                  >
                    ☰
                  </button>
                </div>
              </div>

              {inventory.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
                  <p className="max-w-xs text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
                    Нет доступных предметов для апгрейда
                  </p>
                  <Link
                    href="/#cases"
                    className="rounded-xl border-2 border-cb-flame/70 bg-red-950/25 px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-cb-flame transition hover:bg-red-950/40"
                  >
                    Откройте любой кейс
                  </Link>
                </div>
              ) : gridView ? (
                <div className="max-h-[min(42vh,440px)] overflow-y-auto overflow-x-hidden pr-1 sm:max-h-[480px]">
                  <div className="grid grid-cols-4 gap-1.5">
                    {inventory.map((it) => {
                      const on = selected.has(it.itemId);
                      return (
                        <button
                          key={it.itemId}
                          type="button"
                          disabled={spinning}
                          onClick={() => toggleSel(it.itemId)}
                          className={`relative overflow-hidden rounded-lg border p-1 text-left transition ${rarityCardSurface(it.rarity || "common")} ${
                            on
                              ? "ring-2 ring-cb-flame/60 shadow-[0_0_14px_rgba(255,49,49,0.25)]"
                              : "hover:brightness-110"
                          } disabled:pointer-events-none disabled:opacity-45`}
                        >
                          <div className="relative mx-auto mb-0.5 aspect-square w-full max-h-[4.5rem] bg-black/25">
                            {it.image ? (
                              <Image src={it.image} alt="" fill className="object-contain p-0.5" unoptimized />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">?</div>
                            )}
                          </div>
                          <p className="line-clamp-2 text-[8px] font-medium leading-tight text-zinc-100 sm:text-[9px]">
                            {it.name}
                          </p>
                          <span className={UPGRADE_PRICE_CHIP}>
                            {formatRub(it.sellPrice)} ₽
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="max-h-[min(42vh,440px)] space-y-1 overflow-y-auto overflow-x-hidden pr-1 sm:max-h-[480px]">
                  {inventory.map((it) => {
                    const on = selected.has(it.itemId);
                    return (
                      <button
                        key={it.itemId}
                        type="button"
                        disabled={spinning}
                        onClick={() => toggleSel(it.itemId)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-2 py-2 text-left transition ${rarityCardSurface(it.rarity || "common")} ${
                          on ? "ring-2 ring-cb-flame/55 shadow-[0_0_12px_rgba(255,49,49,0.2)]" : "hover:brightness-105"
                        } disabled:pointer-events-none disabled:opacity-45`}
                      >
                        <div className="relative h-12 w-14 shrink-0 bg-black/25">
                          {it.image ? (
                            <Image src={it.image} alt="" fill className="object-contain p-0.5" unoptimized />
                          ) : null}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <p className="truncate text-[11px] text-zinc-100">{it.name}</p>
                          <span className={UPGRADE_PRICE_CHIP_INLINE}>
                            {formatRub(it.sellPrice)} ₽
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={`${panelClass} flex flex-col p-4`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[13px] font-bold text-white">
                    {useServerEligible ? "Подходящие скины" : "Выберите предмет"}{" "}
                    <span className="font-normal text-zinc-500">({validTargets.length} шт.)</span>
                  </h3>
                  {useServerEligible ? (
                    <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">
                      Только цели, где шанс в допустимых пределах для вашего взноса
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-cb-stroke/80 bg-black/50 p-0.5">
                  <button
                    type="button"
                    disabled={spinning}
                    onClick={() => setGridView(true)}
                    className={`rounded-md px-2 py-1 text-[11px] disabled:opacity-40 ${gridView ? "bg-red-600/30 text-cb-flame" : "text-zinc-500"}`}
                  >
                    ▦
                  </button>
                  <button
                    type="button"
                    disabled={spinning}
                    onClick={() => setGridView(false)}
                    className={`rounded-md px-2 py-1 text-[11px] disabled:opacity-40 ${!gridView ? "bg-red-600/30 text-cb-flame" : "text-zinc-500"}`}
                  >
                    ☰
                  </button>
                </div>
              </div>
              <div className="mb-3 flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
                  Цена от
                  <input
                    type="number"
                    min={0}
                    value={priceMin}
                    disabled={spinning}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="₽"
                    className="w-24 rounded-lg border border-cb-stroke bg-black/50 px-2 py-1.5 text-[12px] text-white disabled:cursor-not-allowed disabled:opacity-45"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
                  до
                  <input
                    type="number"
                    min={0}
                    value={priceMax}
                    disabled={spinning}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="₽"
                    className="w-24 rounded-lg border border-cb-stroke bg-black/50 px-2 py-1.5 text-[12px] text-white disabled:cursor-not-allowed disabled:opacity-45"
                  />
                </label>
                <div className="flex flex-1 flex-col gap-1 sm:min-w-[140px]">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">Поиск</span>
                  <div className="flex rounded-lg border border-cb-stroke bg-black/50">
                    <input
                      value={search}
                      disabled={spinning}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Название…"
                      className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[12px] text-white placeholder:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-45"
                    />
                    <span className="flex items-center px-2 text-zinc-500">⌕</span>
                  </div>
                </div>
              </div>
              <div className="max-h-[min(42vh,440px)] flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-cb-stroke/70 bg-black/35 p-2 sm:max-h-[480px]">
                {validTargets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                    {eligibleLoading && useServerEligible ? (
                      <>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Загрузка подходящих скинов…
                        </p>
                        <p className="text-[10px] text-zinc-600">Сервер отфильтровывает цели по правилам шанса</p>
                      </>
                    ) : useServerEligible && eligibleItems !== null && eligibleItems.length === 0 ? (
                      <>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          Нет целей с подходящим шансом
                        </p>
                        <p className="text-[10px] text-zinc-600">
                          Увеличьте взнос или выберите дороже цель в каталоге (в пределах лимита шанса)
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          Используйте поиск или фильтр цены
                        </p>
                        <p className="text-[10px] text-zinc-600">Нет целей дороже взноса</p>
                      </>
                    )}
                  </div>
                ) : gridView ? (
                  <div className="grid grid-cols-4 gap-1.5">
                    {validTargets.slice(0, 100).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        disabled={spinning}
                        onClick={() => {
                          setTargetId(t.id);
                          setShowResult(null);
                          setLastRoll(null);
                        }}
                        className={`relative overflow-hidden rounded-lg border p-1 text-left transition ${rarityCardSurface(t.rarity)} ${
                          targetId === t.id
                            ? "ring-2 ring-cb-flame/60 shadow-[0_0_14px_rgba(255,49,49,0.25)]"
                            : "hover:brightness-110"
                        } disabled:pointer-events-none disabled:opacity-45`}
                      >
                        <div className="relative mx-auto mb-0.5 aspect-square w-full max-h-[4.5rem] bg-black/25">
                          {t.image ? (
                            <Image src={t.image} alt="" fill className="object-contain p-0.5" unoptimized />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">?</div>
                          )}
                        </div>
                        <p className="line-clamp-2 text-[8px] font-medium leading-tight text-zinc-100 sm:text-[9px]">
                          {t.name}
                        </p>
                        <span className={UPGRADE_PRICE_CHIP}>
                          {formatRub(t.price)} ₽
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {validTargets.slice(0, 100).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        disabled={spinning}
                        onClick={() => {
                          setTargetId(t.id);
                          setShowResult(null);
                          setLastRoll(null);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl border px-2 py-2 text-left transition ${rarityCardSurface(t.rarity)} ${
                          targetId === t.id
                            ? "ring-2 ring-cb-flame/55 shadow-[0_0_12px_rgba(255,49,49,0.2)]"
                            : "hover:brightness-105"
                        } disabled:pointer-events-none disabled:opacity-45`}
                      >
                        <div className="relative h-12 w-14 shrink-0 bg-black/25">
                          {t.image ? (
                            <Image src={t.image} alt="" fill className="object-contain p-0.5" unoptimized />
                          ) : (
                            <span className="flex h-full items-center justify-center text-[10px] text-zinc-600">?</span>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <p className="truncate text-[11px] font-medium text-zinc-100">{t.name}</p>
                          <span className={UPGRADE_PRICE_CHIP_INLINE}>
                            {formatRub(t.price)} ₽
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
