"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaseBatchVerticalRoulette } from "@/components/CaseBatchVerticalRoulette";
import {
  CaseRoulette,
  normRarity,
  rarityBar,
  rarityCardFill,
  type RouletteItem,
} from "@/components/CaseRoulette";
import { CaseNeonRingFrame } from "@/components/CaseNeonRingFrame";
import { SiteShell } from "@/components/SiteShell";
import { apiFetch, getToken } from "@/lib/api";
import { requestAuthModal } from "@/lib/authModal";
import { sortLootGoldToGray } from "@/lib/caseLootSort";
import { formatRub } from "@/lib/money";
import { preferHighResSteamEconomyImage } from "@/lib/steamImage";

type CaseDisplayOdds = {
  referenceRtpPct: number | null;
  modeledRtpPct: number | null;
  items: Array<{ name: string; rarity: string; sellPrice: number; chancePct: number }>;
  note: string;
};

type CaseInfo = {
  slug: string;
  name: string;
  price: number;
  image: string | null;
  skinImage: string | null;
  heroCaseImageScale?: number;
  heroSkinImageScale?: number;
  accent: string;
  itemCount: number;
  items: RouletteItem[];
  displayOdds?: CaseDisplayOdds;
};

type OpenItem = {
  itemId: string;
  name: string;
  rarity: string;
  sellPrice: number;
  image: string;
};

type FairRoll = { rollU: number; targetRtpPct: number };

type OpenResult = {
  item: OpenItem;
  newBalance: number;
  winIndex: number;
  fair?: FairRoll;
};

type BatchOpenResult = {
  results: Array<{ item: OpenItem; winIndex: number; fair?: FairRoll }>;
  newBalance: number;
  count: number;
};

type OpenApiResponse = OpenResult | BatchOpenResult;

function isBatchResponse(d: OpenApiResponse): d is BatchOpenResult {
  return Array.isArray((d as BatchOpenResult).results);
}

const lootRarityBar: Record<string, string> = {
  common: "bg-zinc-500",
  uncommon: "bg-emerald-500",
  rare: "bg-blue-500",
  epic: "bg-fuchsia-500",
  legendary: "bg-amber-400",
  consumer: "bg-zinc-400",
  industrial: "bg-slate-400",
  milspec: "bg-blue-500",
  "mil-spec": "bg-blue-500",
  restricted: "bg-violet-500",
  classified: "bg-fuchsia-500",
  covert: "bg-red-600",
  extraordinary: "bg-amber-400",
  contraband: "bg-orange-500",
};

function FastDropHeroCard({
  loading,
  drop,
}: {
  loading: boolean;
  drop: OpenResult | null;
}) {
  const rk = drop ? normRarity(drop.item.rarity) : "common";
  const fill = rarityCardFill[rk] || rarityCardFill.common;
  const bar = rarityBar[rk] || rarityBar.common;

  return (
    <div
      className={`relative mx-auto w-full max-w-[min(92vw,280px)] shrink-0 overflow-hidden rounded-2xl border border-cb-stroke/70 shadow-[0_20px_50px_rgba(0,0,0,0.45)] sm:max-w-[300px] ${
        loading ? "bg-[#0a0e14]/95" : fill
      }`}
    >
      <div className="relative flex min-h-[220px] flex-col p-3 pb-2 sm:min-h-[260px] sm:p-4">
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="h-28 w-28 animate-pulse rounded-xl bg-zinc-800/90 sm:h-32 sm:w-32" />
            <p className="text-sm font-medium text-zinc-500">Открываем быстро…</p>
          </div>
        ) : drop ? (
          <>
            <div className="relative mx-auto h-[200px] w-full max-w-[260px] sm:h-[240px]">
              {drop.item.image ? (
                <Image
                  src={drop.item.image}
                  alt=""
                  fill
                  className="object-contain drop-shadow-xl"
                  sizes="(max-width: 640px) 85vw, 300px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl text-zinc-500">?</div>
              )}
            </div>
            <p className="mt-3 line-clamp-2 text-center text-xs font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-[13px]">
              {drop.item.name}
            </p>
            <p className="mt-1 text-center text-[10px] uppercase tracking-wide text-zinc-300/90">
              {drop.item.rarity}
            </p>
            <div className={`mt-auto h-1.5 w-full shrink-0 ${bar}`} />
          </>
        ) : null}
      </div>
    </div>
  );
}

function BatchResultMiniCard({
  row,
  onSell,
}: {
  row: { item: OpenItem; winIndex: number };
  onSell: () => void | Promise<void>;
}) {
  const rk = normRarity(row.item.rarity);
  const fill = rarityCardFill[rk] || rarityCardFill.common;
  const bar = rarityBar[rk] || rarityBar.common;
  return (
    <div
      className={`flex w-[140px] shrink-0 flex-col overflow-hidden rounded-xl border border-cb-stroke/70 shadow-lg sm:w-[160px] ${fill}`}
    >
      <div className="relative px-2 pt-2 text-right">
        <span className="font-mono text-[10px] font-bold text-emerald-400">
          {formatRub(row.item.sellPrice)} ₽
        </span>
      </div>
      <div className="relative mx-auto h-[100px] w-full px-2 sm:h-[118px]">
        {row.item.image ? (
          <Image
            src={row.item.image}
            alt=""
            fill
            className="object-contain drop-shadow-[0_0_14px_rgba(34,211,238,0.18)] [transform:translateZ(0)]"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-500">?</div>
        )}
      </div>
      <p className="line-clamp-2 px-2 pb-1 text-center text-[9px] font-semibold leading-tight text-white sm:text-[10px]">
        {row.item.name}
      </p>
      <div className={`h-1 w-full ${bar}`} />
      <button
        type="button"
        onClick={() => {
          void onSell();
        }}
        className="mx-2 mb-2 mt-1.5 rounded-lg bg-emerald-600 py-2 text-[10px] font-bold text-white transition hover:bg-emerald-500 sm:text-xs"
      >
        Продать
      </button>
    </div>
  );
}

function BatchDropHero({
  loading,
  count,
  rows,
  onSellItem,
}: {
  loading: boolean;
  count: number;
  rows: BatchOpenResult["results"] | null;
  onSellItem: (itemId: string) => void | Promise<void>;
}) {
  if (loading) {
    return (
      <div className="flex w-full max-w-5xl flex-wrap justify-center gap-3 sm:gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-52 w-[140px] shrink-0 animate-pulse rounded-xl bg-zinc-800/90 sm:h-56 sm:w-[160px]"
          />
        ))}
      </div>
    );
  }
  if (!rows?.length) return null;
  return (
    <div className="flex w-full max-w-5xl flex-wrap justify-center gap-3 overflow-x-auto px-1 pb-1 sm:gap-4">
      {rows.map((row) => (
        <BatchResultMiniCard
          key={row.item.itemId}
          row={row}
          onSell={() => onSellItem(row.item.itemId)}
        />
      ))}
    </div>
  );
}

export default function CaseOpenPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const searchParams = useSearchParams();
  const openFlag = searchParams.get("open") === "1";

  const [c, setC] = useState<CaseInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [spinWaiting, setSpinWaiting] = useState(false);
  const [landIndex, setLandIndex] = useState<number | null>(null);
  const [landEpoch, setLandEpoch] = useState(0);
  const [drop, setDrop] = useState<OpenResult | null>(null);
  const pendingRef = useRef<OpenResult | null>(null);
  const didAutoOpenRef = useRef(false);
  const [showRoulette, setShowRoulette] = useState(false);
  /** Після «Быстро» показуємо лише картку дропу замість кільця з кейсом */
  const [fastHeroMode, setFastHeroMode] = useState(false);
  const [openMultiplier, setOpenMultiplier] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [batchDrop, setBatchDrop] = useState<BatchOpenResult | null>(null);
  const [sellAllBusy, setSellAllBusy] = useState(false);
  const [batchApiWaiting, setBatchApiWaiting] = useState(false);
  const [batchLandIndices, setBatchLandIndices] = useState<number[] | null>(null);
  const [batchLandEpoch, setBatchLandEpoch] = useState(0);
  const [batchSpinSession, setBatchSpinSession] = useState(0);
  const [batchFastOpening, setBatchFastOpening] = useState(false);
  const pendingBatchRef = useRef<BatchOpenResult | null>(null);
  /** Останнє відкриття ×2+ було «Быстро» — «Ще раз» повторює той самий режим */
  const batchLastOpenWasFastRef = useRef(false);

  const loadCase = useCallback(async () => {
    const r = await apiFetch<CaseInfo>(`/api/cases/${slug}`);
    if (!r.ok) {
      setErr(r.error || "Кейс не найден");
      setC(null);
      return;
    }
    setC(r.data!);
    setErr(null);
  }, [slug]);

  useEffect(() => {
    if (slug) loadCase();
  }, [slug, loadCase]);

  useEffect(() => {
    const h = () => loadCase();
    window.addEventListener("cd-cases-updated", h);
    return () => window.removeEventListener("cd-cases-updated", h);
  }, [loadCase]);

  useEffect(() => {
    setOpenMultiplier(1);
    setBatchLandEpoch(0);
    setBatchLandIndices(null);
    setBatchApiWaiting(false);
    setBatchDrop(null);
    pendingBatchRef.current = null;
    setBatchFastOpening(false);
  }, [slug]);

  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const loadWalletBalance = useCallback(async () => {
    if (!getToken()) {
      setWalletBalance(null);
      return;
    }
    const r = await apiFetch<{ balance: number }>("/api/me");
    if (r.ok && r.data && typeof r.data.balance === "number") {
      setWalletBalance(r.data.balance);
    } else {
      setWalletBalance(null);
    }
  }, []);

  useEffect(() => {
    void loadWalletBalance();
  }, [loadWalletBalance]);

  useEffect(() => {
    const h = () => void loadWalletBalance();
    window.addEventListener("cd-balance-updated", h);
    return () => window.removeEventListener("cd-balance-updated", h);
  }, [loadWalletBalance]);

  const runOpenBatch = useCallback(
    async (animated: boolean) => {
      if (!getToken()) {
        requestAuthModal(`/cases/${slug}?open=1`);
        return;
      }
      const n = openMultiplier;
      if (n < 2) return;

      batchLastOpenWasFastRef.current = !animated;

      setDrop(null);
      setBatchDrop(null);
      pendingBatchRef.current = null;
      setBatchLandIndices(null);
      setFastHeroMode(true);
      setShowRoulette(false);
      pendingRef.current = null;
      setLandIndex(null);

      if (animated) {
        setBatchFastOpening(false);
        setBatchSpinSession((s) => s + 1);
      } else {
        setBatchFastOpening(true);
      }

      setBatchApiWaiting(true);

      const r = await apiFetch<OpenApiResponse>(`/api/cases/${slug}/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: n }),
      });

      setBatchApiWaiting(false);

      if (!r.ok) {
        setFastHeroMode(false);
        setBatchLandIndices(null);
        setBatchFastOpening(false);
        if (r.status === 401) return;
        if (r.status === 429) return;
        alert(r.error || "Ошибка");
        return;
      }

      const data = r.data!;
      if (isBatchResponse(data)) {
        if (animated) {
          pendingBatchRef.current = {
            results: data.results,
            newBalance: data.newBalance,
            count: data.count,
          };
          setBatchLandIndices(data.results.map((x) => x.winIndex));
          setBatchLandEpoch((e) => e + 1);
        } else {
          setBatchFastOpening(false);
          setBatchDrop({
            results: data.results,
            newBalance: data.newBalance,
            count: data.count,
          });
        }
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cd-balance-updated"));
      }
    },
    [slug, openMultiplier],
  );

  const openBatch = useCallback(() => runOpenBatch(true), [runOpenBatch]);

  const openBatchFast = useCallback(() => runOpenBatch(false), [runOpenBatch]);

  const openCase = useCallback(async () => {
    if (!getToken()) {
      requestAuthModal(`/cases/${slug}?open=1`);
      return;
    }
    if (openMultiplier > 1) {
      await openBatch();
      return;
    }
    setFastHeroMode(false);
    setBatchDrop(null);
    pendingBatchRef.current = null;
    setBatchLandIndices(null);
    setBatchApiWaiting(false);
    setBatchFastOpening(false);
    setDrop(null);
    setShowRoulette(true);
    pendingRef.current = null;
    setLandIndex(null);
    setSpinWaiting(true);

    const r = await apiFetch<OpenResult>(`/api/cases/${slug}/open`, {
      method: "POST",
    });

    setSpinWaiting(false);

    if (!r.ok) {
      if (r.status === 401) return;
      if (r.status === 429) return;
      alert(r.error || "Ошибка");
      return;
    }

    pendingRef.current = r.data!;
    setLandIndex(r.data!.winIndex);
    setLandEpoch((e) => e + 1);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cd-balance-updated"));
    }
  }, [slug, openMultiplier, openBatch]);

  const openBatchAgain = useCallback(() => {
    void (batchLastOpenWasFastRef.current ? openBatchFast() : openBatch());
  }, [openBatch, openBatchFast]);

  const openCaseFast = useCallback(async () => {
    if (!getToken()) {
      requestAuthModal(`/cases/${slug}?open=1`);
      return;
    }
    if (openMultiplier > 1) {
      await openBatchFast();
      return;
    }
    setFastHeroMode(true);
    setBatchDrop(null);
    pendingBatchRef.current = null;
    setBatchLandIndices(null);
    setBatchApiWaiting(false);
    setBatchFastOpening(false);
    setDrop(null);
    setShowRoulette(false);
    pendingRef.current = null;
    setLandIndex(null);
    setSpinWaiting(true);

    const r = await apiFetch<OpenResult>(`/api/cases/${slug}/open`, {
      method: "POST",
    });

    setSpinWaiting(false);

    if (!r.ok) {
      setFastHeroMode(false);
      if (r.status === 401) return;
      if (r.status === 429) return;
      alert(r.error || "Ошибка");
      return;
    }

    setDrop(r.data!);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cd-balance-updated"));
    }
  }, [slug, openMultiplier, openBatchFast]);

  const handleSellBatchItem = useCallback(async (itemId: string) => {
    const r = await apiFetch<{ newBalance: number }>("/api/inventory/sell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    if (!r.ok) {
      alert(r.error || "Не удалось продать");
      return;
    }
    const nb = r.data!.newBalance;
    setBatchDrop((prev) => {
      if (!prev) return null;
      const results = prev.results.filter((x) => x.item.itemId !== itemId);
      if (results.length === 0) {
        setFastHeroMode(false);
        setBatchFastOpening(false);
        return null;
      }
      return { ...prev, results, newBalance: nb };
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cd-balance-updated"));
    }
  }, []);

  useEffect(() => {
    if (!openFlag) return;
    if (didAutoOpenRef.current) return;
    if (!getToken()) {
      requestAuthModal(`/cases/${slug}?open=1`);
      return;
    }
    if (!c) return;
    if (walletBalance === null) return;
    didAutoOpenRef.current = true;
    const need = (c.price ?? 0) * openMultiplier;
    if (walletBalance < need) return;
    void openCase();
  }, [openFlag, openCase, slug, c, walletBalance, openMultiplier]);

  function handleLandComplete() {
    if (pendingRef.current) {
      setDrop(pendingRef.current);
      pendingRef.current = null;
    }
  }

  function handleBatchLandComplete() {
    if (pendingBatchRef.current) {
      setBatchDrop(pendingBatchRef.current);
      pendingBatchRef.current = null;
    }
    setBatchLandIndices(null);
  }

  const lootSortedForGrid = useMemo(
    () => sortLootGoldToGray(c?.items ?? []),
    [c?.items],
  );

  const batchAnimating =
    fastHeroMode &&
    openMultiplier > 1 &&
    !batchDrop &&
    (batchApiWaiting ||
      (batchLandIndices !== null && batchLandIndices.length > 0));
  const busyOpening =
    spinWaiting ||
    (landIndex !== null && !drop && showRoulette) ||
    batchAnimating;
  const showBatchRouletteSection = batchAnimating && !batchFastOpening;
  const showBatchFastLoadingHero =
    batchFastOpening && batchApiWaiting && openMultiplier > 1;
  const showBatchResultCards = Boolean(batchDrop);
  const totalOpenPrice = c ? c.price * openMultiplier : 0;

  const resolvedBalance = drop?.newBalance ?? batchDrop?.newBalance ?? walletBalance;
  const shortOnFunds = Boolean(
    getToken() &&
      c &&
      resolvedBalance !== null &&
      totalOpenPrice > 0 &&
      resolvedBalance < totalOpenPrice,
  );

  function openCryptoTopUp() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("cd-open-crypto-topup"));
  }

  const batchSellTotalRub = useMemo(() => {
    if (!batchDrop?.results.length) return 0;
    return batchDrop.results.reduce((s, r) => s + (Number(r.item.sellPrice) || 0), 0);
  }, [batchDrop]);

  const handleSellAllBatch = useCallback(async () => {
    if (!batchDrop?.results.length || sellAllBusy) return;
    setSellAllBusy(true);
    const rows = batchDrop.results;
    try {
      for (const row of rows) {
        const r = await apiFetch<{ newBalance: number }>("/api/inventory/sell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: row.item.itemId }),
        });
        if (!r.ok) {
          alert(r.error || "Не удалось продать");
          return;
        }
      }
      setBatchDrop(null);
      setFastHeroMode(false);
      setBatchFastOpening(false);
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cd-balance-updated"));
      }
    } finally {
      setSellAllBusy(false);
    }
  }, [batchDrop, router, sellAllBusy]);

  if (!slug) return null;

  const heroCaseS = (c?.heroCaseImageScale ?? 100) / 100;
  const heroSkinS = (c?.heroSkinImageScale ?? 100) / 100;

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-zinc-500 transition hover:text-cb-flame"
        >
          ← Главная
        </Link>

        {err && <p className="mb-4 text-red-400">{err}</p>}

        {c && (
          <>
            <div className="mb-8 flex flex-col items-center gap-8">
              {!showRoulette &&
                (showBatchRouletteSection ? (
                  <CaseBatchVerticalRoulette
                    key={batchSpinSession}
                    items={c.items}
                    columnCount={openMultiplier}
                    spinWaiting={batchApiWaiting}
                    landIndices={batchLandIndices}
                    landEpoch={batchLandEpoch}
                    onLandComplete={handleBatchLandComplete}
                  />
                ) : showBatchResultCards ? (
                  <BatchDropHero
                    loading={false}
                    count={openMultiplier}
                    rows={batchDrop?.results ?? null}
                    onSellItem={handleSellBatchItem}
                  />
                ) : showBatchFastLoadingHero ? (
                  <BatchDropHero
                    loading
                    count={openMultiplier}
                    rows={null}
                    onSellItem={handleSellBatchItem}
                  />
                ) : fastHeroMode &&
                  !showBatchRouletteSection &&
                  !showBatchResultCards ? (
                  <FastDropHeroCard loading={spinWaiting && !drop} drop={drop} />
                ) : (
                  <CaseNeonRingFrame>
                    <div className="relative h-full min-h-[200px] w-full overflow-visible sm:min-h-[240px]">
                      {c.image ? (
                        <div className="pointer-events-none absolute -inset-[6%] z-[1] flex -translate-y-1 items-end justify-center sm:-inset-[5%] sm:-translate-y-2">
                          <div
                            className="relative h-[102%] w-[112%] max-w-none origin-bottom sm:h-[106%] sm:w-[116%]"
                            style={{ transform: `translateZ(0) scale(${heroCaseS})` }}
                          >
                            <Image
                              src={preferHighResSteamEconomyImage(c.image) ?? c.image}
                              alt=""
                              fill
                              sizes="(max-width: 640px) 96vw, (max-width: 1536px) 45vw, 640px"
                              quality={100}
                              className="object-contain object-bottom origin-bottom scale-[1.22] drop-shadow-[0_12px_36px_rgba(0,0,0,0.55)] sm:scale-[1.28] [image-rendering:high-quality] [-webkit-backface-visibility:hidden]"
                              priority
                              unoptimized
                            />
                          </div>
                        </div>
                      ) : null}
                      {c.skinImage ? (
                        <div className="pointer-events-none absolute inset-0 z-20 flex -translate-y-4 items-center justify-center p-[8%] sm:-translate-y-6">
                          <div
                            className="relative h-full max-h-[68%] w-full max-w-[72%] origin-center sm:max-h-[70%] sm:max-w-[74%]"
                            style={{ transform: `translateZ(0) scale(${heroSkinS})` }}
                          >
                            <div className="cb-case-skin-float relative h-full w-full">
                              <Image
                                src={preferHighResSteamEconomyImage(c.skinImage) ?? c.skinImage}
                                alt=""
                                fill
                                sizes="(max-width: 640px) 70vw, (max-width: 1536px) 38vw, 520px"
                                quality={100}
                                className="object-contain drop-shadow-[0_0_28px_rgba(255,255,255,0.12)] [image-rendering:high-quality] [-webkit-backface-visibility:hidden]"
                                priority
                                unoptimized
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {!c.image && !c.skinImage ? (
                        <div className="flex h-full min-h-[200px] w-full items-center justify-center bg-transparent sm:min-h-[240px]">
                          <span className="text-8xl font-black text-zinc-700/40">
                            {c.name.slice(0, 1)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </CaseNeonRingFrame>
                ))}

              <div className="min-w-0 w-full">
                <h1 className="text-center text-2xl font-bold text-white sm:text-3xl">
                  {c.name}
                </h1>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <span className="w-full text-center text-[11px] font-medium uppercase tracking-wide text-zinc-500 sm:w-auto">
                    Открыть сразу
                  </span>
                  {([1, 2, 3, 4, 5] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={busyOpening}
                      onClick={() => setOpenMultiplier(m)}
                      className={
                        openMultiplier === m
                          ? "rounded-lg bg-gradient-to-r from-red-900/90 to-cb-flame/95 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-red-950/25"
                          : "rounded-lg border border-zinc-600/80 bg-zinc-900/80 px-3 py-1.5 text-xs font-bold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-45"
                      }
                    >
                      ×{m}
                    </button>
                  ))}
                </div>

                {(showRoulette || drop || batchDrop) && (
                  <div className="mt-8 flex w-full flex-col items-center">
                    {showRoulette && (
                      <div className="w-full pt-11 sm:pt-12">
                        <CaseRoulette
                          key={`${slug}-${landEpoch}`}
                          items={c.items}
                          spinWaiting={spinWaiting}
                          landOnIndex={landIndex}
                          landEpoch={landEpoch}
                          onLandComplete={handleLandComplete}
                          accentWinner={!!drop}
                        />
                      </div>
                    )}

                    {drop && (
                      <div
                        className={`flex w-full max-w-md flex-col items-center gap-5 px-2 ${showRoulette ? "mt-8" : ""}`}
                      >
                        <div className="flex w-full flex-wrap items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (shortOnFunds) {
                                openCryptoTopUp();
                                return;
                              }
                              void (
                                openMultiplier > 1
                                  ? openBatchAgain()
                                  : fastHeroMode
                                    ? openCaseFast()
                                    : openCase()
                              );
                            }}
                            className={
                              shortOnFunds
                                ? "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-cb-stroke/90 bg-gradient-to-r from-red-900/80 to-cb-flame/90 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-950/30 transition hover:brightness-110 sm:flex-none sm:px-8"
                                : "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-amber-500/85 bg-transparent px-4 py-3 text-sm font-bold text-amber-400 transition hover:border-amber-400 hover:bg-amber-500/10 sm:px-5"
                            }
                          >
                            {shortOnFunds ? (
                              <>Пополнить</>
                            ) : (
                              <>
                                <span className="text-base leading-none" aria-hidden>
                                  ↻
                                </span>
                                Попробовать ещё раз
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDrop(null);
                              setLandIndex(null);
                              setShowRoulette(false);
                              setFastHeroMode(false);
                              router.refresh();
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-600 bg-zinc-800/90 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 sm:px-5"
                          >
                            Забрать
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const r = await apiFetch<{ newBalance: number }>(
                                "/api/inventory/sell",
                                {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ itemId: drop.item.itemId }),
                                },
                              );
                              if (!r.ok) {
                                alert(r.error || "Не удалось продать");
                                return;
                              }
                              setDrop(null);
                              setLandIndex(null);
                              setShowRoulette(false);
                              setFastHeroMode(false);
                              router.refresh();
                              if (typeof window !== "undefined") {
                                window.dispatchEvent(new CustomEvent("cd-balance-updated"));
                              }
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-bold text-zinc-900 shadow-md transition hover:brightness-110 sm:px-5"
                          >
                            <span className="text-base leading-none opacity-90" aria-hidden>
                              🛒
                            </span>
                            Продать за {formatRub(drop.item.sellPrice)} ₽
                          </button>
                        </div>
                      </div>
                    )}

                    {batchDrop && (
                      <div
                        className={`flex w-full max-w-3xl flex-col items-center gap-5 px-2 ${showRoulette ? "mt-8" : ""}`}
                      >
                        <div className="flex w-full flex-wrap items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (shortOnFunds) {
                                openCryptoTopUp();
                                return;
                              }
                              void (openMultiplier > 1 ? openBatchAgain() : openCaseFast());
                            }}
                            className={
                              shortOnFunds
                                ? "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-cb-stroke/90 bg-gradient-to-r from-red-900/80 to-cb-flame/90 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-950/30 transition hover:brightness-110 sm:flex-none sm:px-8"
                                : "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-amber-500/85 bg-transparent px-4 py-3 text-sm font-bold text-amber-400 transition hover:border-amber-400 hover:bg-amber-500/10 sm:px-5"
                            }
                          >
                            {shortOnFunds ? (
                              <>Пополнить</>
                            ) : (
                              <>
                                <span className="text-base leading-none" aria-hidden>
                                  ↻
                                </span>
                                Попробовать ещё раз
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBatchDrop(null);
                              setFastHeroMode(false);
                              setBatchFastOpening(false);
                              router.refresh();
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-600 bg-zinc-800/90 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 sm:px-5"
                          >
                            Забрать
                          </button>
                          <button
                            type="button"
                            disabled={busyOpening || sellAllBusy}
                            onClick={() => {
                              void handleSellAllBatch();
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-bold text-zinc-900 shadow-md transition hover:brightness-110 disabled:opacity-45 sm:px-5"
                          >
                            <span className="text-base leading-none opacity-90" aria-hidden>
                              🛒
                            </span>
                            Продать всё за {formatRub(batchSellTotalRub)} ₽
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!drop && !batchDrop && (
                  <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
                    {shortOnFunds ? (
                      <button
                        type="button"
                        onClick={openCryptoTopUp}
                        className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-xl border border-cb-stroke/90 bg-gradient-to-r from-red-900/80 to-cb-flame/90 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-950/30 transition hover:brightness-110 sm:max-w-md sm:flex-none sm:px-12"
                      >
                        Пополнить
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={busyOpening}
                          onClick={openCase}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-cb-stroke/90 bg-gradient-to-r from-red-900/80 to-cb-flame/90 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-950/30 transition hover:brightness-110 disabled:opacity-45 sm:flex-none sm:px-10"
                        >
                          <span aria-hidden>📦</span>
                          {spinWaiting
                            ? "Открываем…"
                            : landIndex !== null && !drop && showRoulette
                              ? "Рулетка…"
                              : `Открыть за ${formatRub(totalOpenPrice)} ₽`}
                        </button>
                        <button
                          type="button"
                          disabled={busyOpening}
                          onClick={() => {
                            void openCaseFast();
                          }}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-500/55 bg-gradient-to-r from-amber-600/25 to-yellow-600/20 py-3.5 text-sm font-bold text-amber-200 shadow-md shadow-amber-950/20 transition hover:border-amber-400/70 hover:brightness-110 disabled:opacity-45 sm:flex-none sm:px-8"
                          title={
                            openMultiplier > 1
                              ? "Без вертикальной рулетки — сразу все выпавшие предметы"
                              : "Без анимации рулетки, сразу результат"
                          }
                        >
                          <span aria-hidden>⚡</span>
                          {spinWaiting
                            ? "Открываем…"
                            : `Быстро за ${formatRub(totalOpenPrice)} ₽`}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <section className="mt-14 border-t border-amber-500/20 pt-10">
              <div className="rounded-2xl border border-amber-500/15 bg-gradient-to-b from-amber-500/[0.09] via-zinc-950/50 to-zinc-950 p-6 shadow-[inset_0_1px_0_rgba(250,204,21,0.06)] sm:p-8">
                <h2 className="mb-6 bg-gradient-to-r from-amber-200/90 via-zinc-200 to-zinc-500/90 bg-clip-text text-lg font-bold uppercase tracking-wider text-transparent">
                  Содержимое кейса
                </h2>
                <p className="mb-6 text-xs text-zinc-500">
                  От редких (золото) к частым (серый).
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {lootSortedForGrid.map((it, idx) => {
                  const bar = lootRarityBar[it.rarity] || lootRarityBar.common;
                  return (
                    <div
                      key={`${it.name}-${idx}`}
                      className="group relative flex flex-col overflow-hidden rounded-xl border border-cb-stroke/70 bg-[#0a0e14]/90 transition hover:border-orange-500/30"
                    >
                      <div className="absolute left-2 top-2 z-10 rounded-md bg-gradient-to-r from-orange-600/90 to-red-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-md">
                        {formatRub(it.sellPrice)} ₽
                      </div>
                      <div className="relative aspect-square w-full bg-black/35 p-2">
                        {it.image ? (
                          <Image
                            src={it.image}
                            alt=""
                            fill
                            className="object-contain p-1 transition group-hover:scale-105"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-zinc-700">?</div>
                        )}
                      </div>
                      <div className="border-t border-cb-stroke/50 px-2 py-2">
                        <p className="line-clamp-2 text-center text-[11px] font-medium leading-tight text-zinc-200">
                          {it.name}
                        </p>
                      </div>
                      <div className={`h-1 w-full ${bar}`} />
                    </div>
                  );
                })}
                </div>
              </div>
            </section>
          </>
        )}

      </div>
    </SiteShell>
  );
}
