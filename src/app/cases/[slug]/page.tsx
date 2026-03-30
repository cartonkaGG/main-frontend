"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CaseRoulette, type RouletteItem } from "@/components/CaseRoulette";
import { CASE_FRAMES } from "@/components/CaseCard";
import { SiteShell } from "@/components/SiteShell";
import { apiFetch, getToken } from "@/lib/api";
import { requestAuthModal } from "@/lib/authModal";
import { formatRub } from "@/lib/money";

type CaseInfo = {
  slug: string;
  name: string;
  price: number;
  image: string | null;
  accent: string;
  itemCount: number;
  items: RouletteItem[];
};

type OpenResult = {
  item: {
    itemId: string;
    name: string;
    rarity: string;
    sellPrice: number;
    image: string;
  };
  newBalance: number;
  winIndex: number;
};

const rarityBg: Record<string, string> = {
  common: "from-zinc-800 to-zinc-900",
  uncommon: "from-emerald-900/40 to-zinc-900",
  rare: "from-blue-900/40 to-zinc-900",
  epic: "from-purple-900/40 to-zinc-900",
  legendary: "from-red-950/70 to-zinc-900",
};

const lootRarityBar: Record<string, string> = {
  common: "bg-zinc-500",
  uncommon: "bg-emerald-500",
  rare: "bg-blue-500",
  epic: "bg-fuchsia-500",
  legendary: "bg-amber-400",
};

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

  const openCase = useCallback(async () => {
    if (!getToken()) {
      requestAuthModal(`/cases/${slug}?open=1`);
      return;
    }
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
  }, [slug]);

  useEffect(() => {
    if (!openFlag) return;
    if (didAutoOpenRef.current) return;
    if (!getToken()) {
      requestAuthModal(`/cases/${slug}?open=1`);
      return;
    }
    didAutoOpenRef.current = true;
    void openCase();
  }, [openFlag, openCase, slug]);

  function handleLandComplete() {
    if (pendingRef.current) {
      setDrop(pendingRef.current);
      pendingRef.current = null;
    }
  }

  if (!slug) return null;

  const loot = c?.items ?? [];

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/cases"
          className="mb-6 inline-block text-sm text-zinc-500 transition hover:text-cb-flame"
        >
          ← Все кейсы
        </Link>

        {err && <p className="mb-4 text-red-400">{err}</p>}

        {c && (
          <>
            <div className="mb-8 flex flex-col items-center gap-8">
              {!showRoulette && (
                <div
                  className={`relative mx-auto aspect-square w-full max-w-[280px] shrink-0 overflow-hidden rounded-2xl border sm:max-w-xs ${
                    CASE_FRAMES[c.accent] || CASE_FRAMES.amber
                  }`}
                >
                  {c.image ? (
                    <Image
                      src={c.image}
                      alt=""
                      fill
                      className="object-cover"
                      priority
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-black/25">
                      <span className="text-8xl font-black text-zinc-700/40">
                        {c.name.slice(0, 1)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="min-w-0 w-full">
                <h1 className="text-center text-2xl font-bold text-white sm:text-3xl">
                  {c.name}
                </h1>
                <p className="mt-2 text-center text-sm text-zinc-400">
                  Цена открытия:{" "}
                  <span className="font-mono text-cb-flame">{formatRub(c.price)} ₽</span>
                  <span className="text-zinc-600"> · </span>
                  {c.itemCount} предметов в пуле
                </p>

                {showRoulette && (
                  <div className="mt-8">
                    <CaseRoulette
                      key={`${slug}-${landEpoch}`}
                      items={loot}
                      spinWaiting={spinWaiting}
                      landOnIndex={landIndex}
                      landEpoch={landEpoch}
                      onLandComplete={handleLandComplete}
                    />
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={spinWaiting || drop !== null || (landIndex !== null && !drop)}
                    onClick={openCase}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-cb-stroke/90 bg-gradient-to-r from-red-900/80 to-cb-flame/90 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-950/30 transition hover:brightness-110 disabled:opacity-45 sm:flex-none sm:px-10"
                  >
                    <span aria-hidden>📦</span>
                    {spinWaiting
                      ? "Открываем…"
                      : landIndex !== null && !drop
                        ? "Рулетка…"
                      : `Открыть за ${formatRub(c.price)} ₽`}
                  </button>
                  <button
                    type="button"
                    disabled
                    className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-cb-stroke/50 py-3.5 text-sm font-semibold text-zinc-600 opacity-60 sm:flex-none sm:px-8"
                    title="Скоро"
                  >
                    <span aria-hidden>⚡</span>
                    Быстро за {formatRub(c.price)} ₽
                  </button>
                </div>
              </div>
            </div>

            <section className="mt-14 border-t border-cb-stroke/50 pt-10">
              <h2 className="mb-6 text-lg font-bold uppercase tracking-wider text-zinc-300">
                Содержимое кейса
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {loot.map((it, idx) => {
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
            </section>
          </>
        )}

        {drop && (
          <div
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm`}
          >
            <div
              className={`w-full max-w-md rounded-2xl border border-cb-stroke/80 bg-gradient-to-br p-8 shadow-2xl ${
                rarityBg[drop.item.rarity] || rarityBg.common
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Выпало</p>
              <p className="mt-3 text-2xl font-bold text-white">{drop.item.name}</p>
              <p className="mt-2 text-sm text-zinc-400">
                Редкость: {drop.item.rarity} · продажа {formatRub(drop.item.sellPrice)} ₽
              </p>
              <p className="mt-4 font-mono text-cb-flame">
                Новый баланс: {formatRub(drop.newBalance)} ₽
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {/* Забрать предмет и закрыть модалку */}
                <button
                  type="button"
                  onClick={() => {
                    setDrop(null);
                    setLandIndex(null);
                    setShowRoulette(false);
                    router.refresh();
                  }}
                  className="rounded-xl bg-zinc-800/90 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700"
                >
                  Забрать
                </button>
                {/* Продать сразу этот дроп */}
                <button
                  type="button"
                  onClick={async () => {
                    const r = await apiFetch<{ newBalance: number }>("/api/inventory/sell", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ itemId: drop.item.itemId }),
                    });
                    if (!r.ok) {
                      alert(r.error || "Не удалось продать");
                      return;
                    }
                    setDrop(null);
                    setLandIndex(null);
                    setShowRoulette(false);
                    router.refresh();
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("cd-balance-updated"));
                    }
                  }}
                  className="rounded-xl border border-red-500/70 bg-red-900/40 px-5 py-2.5 text-sm font-semibold text-red-200 hover:bg-red-900/60"
                >
                  Продать
                </button>
                {/* Просто закрыть модалку (ничего не меняя) */}
                <button
                  type="button"
                  onClick={() => {
                    setDrop(null);
                    setLandIndex(null);
                  }}
                  className="rounded-xl border border-cb-stroke bg-black/20 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:border-orange-500/40"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
