"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { normRarity, rarityBar } from "@/components/CaseRoulette";
import { SiteShell } from "@/components/SiteShell";
import { apiFetch, getToken } from "@/lib/api";
import { requestAuthModal } from "@/lib/authModal";
import { formatRub } from "@/lib/money";

function splitItemName(item: string): { weapon: string; skin: string } {
  const t = item.trim();
  const idx = t.indexOf("|");
  if (idx === -1) return { weapon: t, skin: "" };
  return {
    weapon: t.slice(0, idx).trim(),
    skin: t.slice(idx + 1).trim(),
  };
}

type Me = {
  steamId?: string;
  displayName: string;
  avatar: string;
  balance: number;
  inventory: {
    itemId: string;
    name: string;
    image: string;
    rarity: string;
    sellPrice: number;
    caseSlug?: string;
  }[];
  bestEverItem?: {
    name: string;
    image: string | null;
    rarity: string;
    sellPrice: number;
  };
};

type BestDrop = {
  name: string;
  image: string | null;
  rarity: string;
  sellPrice: number;
};

const rarityClass: Record<string, string> = {
  common: "border-zinc-600/80 bg-zinc-950/50 text-zinc-300",
  uncommon: "border-emerald-600/50 bg-emerald-950/20 text-emerald-300",
  rare: "border-blue-600/50 bg-blue-950/25 text-blue-300",
  epic: "border-purple-600/50 bg-purple-950/25 text-purple-300",
  legendary: "border-orange-500/50 bg-red-950/30 text-orange-300",
  consumer: "border-zinc-500/60 bg-zinc-950/45 text-zinc-300",
  industrial: "border-slate-500/50 bg-slate-950/30 text-slate-300",
  milspec: "border-blue-600/50 bg-blue-950/25 text-blue-300",
  "mil-spec": "border-blue-600/50 bg-blue-950/25 text-blue-300",
  restricted: "border-violet-600/50 bg-violet-950/25 text-violet-200",
  classified: "border-fuchsia-600/50 bg-fuchsia-950/25 text-fuchsia-200",
  covert: "border-red-600/55 bg-red-950/35 text-red-200",
  extraordinary: "border-amber-500/50 bg-amber-950/25 text-amber-200",
  contraband: "border-orange-500/55 bg-orange-950/30 text-orange-200",
};

function ProfileHexBg() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.18]"
      style={{
        backgroundImage: `
          linear-gradient(90deg, rgba(249,115,22,0.11) 1px, transparent 1px),
          linear-gradient(rgba(249,115,22,0.07) 1px, transparent 1px)
        `,
        backgroundSize: "24px 24px",
      }}
    />
  );
}

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [sellAllBusy, setSellAllBusy] = useState(false);
  const [depositNotice, setDepositNotice] = useState<string | null>(null);

  const inventorySellTotal = useMemo(
    () => (me?.inventory ?? []).reduce((s, it) => s + (Number(it.sellPrice) || 0), 0),
    [me?.inventory],
  );

  const load = useCallback(async () => {
    if (!getToken()) {
      setMe(null);
      setErr(null);
      return;
    }
    const r = await apiFetch<Me>("/api/me");
    if (!r.ok) {
      setErr(r.error || "Ошибка");
      setMe(null);
      return;
    }
    setErr(null);
    setMe(r.data!);
  }, []);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const h = () => load();
    window.addEventListener("cd-balance-updated", h);
    return () => window.removeEventListener("cd-balance-updated", h);
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    const q = new URLSearchParams(window.location.search);
    const d = q.get("deposit");
    if (d === "success") {
      window.dispatchEvent(new CustomEvent("cd-balance-updated"));
      window.history.replaceState({}, "", "/profile");
      setDepositNotice("После успешной оплаты баланс обновится автоматически (обычно в течение нескольких минут).");
    } else if (d === "cancel") {
      window.history.replaceState({}, "", "/profile");
      setDepositNotice("Оплата отменена.");
    }
  }, [hydrated]);

  const bestDrop: BestDrop | null = me
    ? me.bestEverItem
      ? {
          name: me.bestEverItem.name,
          image: me.bestEverItem.image ?? null,
          rarity: me.bestEverItem.rarity,
          sellPrice: me.bestEverItem.sellPrice,
        }
      : me.inventory.reduce<BestDrop | null>(
          (acc, it) => {
            const current = acc?.sellPrice ?? -Infinity;
            return it.sellPrice > current
              ? {
                  name: it.name,
                  image: it.image ?? null,
                  rarity: it.rarity,
                  sellPrice: it.sellPrice,
                }
              : acc;
          },
          null,
        )
    : null;

  async function applyPromo() {
    const c = promoCode.trim();
    if (!c) {
      setPromoMsg("Введите промокод");
      return;
    }
    if (!getToken()) {
      requestAuthModal("/profile");
      return;
    }
    setPromoBusy(true);
    setPromoMsg(null);
    const r = await apiFetch<{
      granted?: number;
      newBalance?: number;
      depositPercent?: number;
      error?: string;
    }>(
      "/api/promo/redeem",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }),
      }
    );
    setPromoBusy(false);
    if (!r.ok) {
      setPromoMsg(r.error || "Не удалось применить");
      return;
    }
    if (typeof r.data?.depositPercent === "number") {
      setPromoMsg(`+${r.data.depositPercent}% к депозиту`);
    } else {
      setPromoMsg(`Начислено ${formatRub(r.data?.granted ?? 0)} ₽`);
    }
    setPromoCode("");
    await load();
    window.dispatchEvent(new CustomEvent("cd-balance-updated"));
  }

  async function sell(itemId: string) {
    if (!getToken()) {
      requestAuthModal("/profile");
      return;
    }
    const r = await apiFetch<{ newBalance: number }>("/api/inventory/sell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    if (!r.ok) {
      alert(r.error);
      return;
    }
    await load();
    window.dispatchEvent(new CustomEvent("cd-balance-updated"));
  }

  async function sellAll() {
    if (!getToken()) {
      requestAuthModal("/profile");
      return;
    }
    if (!me?.inventory.length || sellAllBusy) return;
    setSellAllBusy(true);
    const r = await apiFetch<{ newBalance: number; totalSold: number; count: number }>(
      "/api/inventory/sell-all",
      { method: "POST" },
    );
    setSellAllBusy(false);
    if (!r.ok) {
      alert(r.error || "Не удалось продать");
      return;
    }
    await load();
    window.dispatchEvent(new CustomEvent("cd-balance-updated"));
  }

  return (
    <SiteShell>
      <div className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="relative overflow-hidden rounded-[1.5rem] border border-orange-500/25 bg-[#060a12] shadow-[0_0_60px_-20px_rgba(234,88,12,0.35)]">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-950/35 via-transparent to-orange-950/15"
            aria-hidden
          />
          <ProfileHexBg />

          <div className="relative p-6 sm:p-10">
            <h1 className="mb-8 text-center text-xs font-bold uppercase tracking-[0.35em] text-orange-400/90 sm:text-left">
              Профиль
            </h1>

            {hydrated && !getToken() && (
              <div className="mb-8 rounded-2xl border border-violet-500/30 bg-violet-950/20 px-5 py-6 text-center text-sm text-zinc-300 sm:text-left">
                Войдите через Steam в шапке, чтобы видеть баланс, промокоды и инвентарь.
              </div>
            )}

            {err && (
              <p className="mb-6 rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                {err}
              </p>
            )}

            {depositNotice && (
              <p className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200/95">
                {depositNotice}
              </p>
            )}

            {me && (
              <>
                <div className="mb-10 flex flex-col items-center gap-6 rounded-2xl border border-cb-stroke/50 bg-[#0a1020]/80 p-6 shadow-inner backdrop-blur-sm sm:flex-row sm:items-center sm:gap-8">
                  <div className="relative shrink-0">
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-orange-500/50 to-violet-600/50 opacity-80 blur-sm" />
                    <div className="relative overflow-hidden rounded-2xl ring-2 ring-orange-500/30">
                      {me.avatar ? (
                        <Image
                          src={me.avatar}
                          alt=""
                          width={96}
                          height={96}
                          className="h-24 w-24 object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center bg-zinc-900 text-2xl text-zinc-600">
                          ?
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="truncate text-xl font-bold text-white sm:text-2xl">{me.displayName}</p>
                    <div className="mt-4 inline-flex flex-col items-center gap-1 rounded-xl border border-orange-500/35 bg-gradient-to-r from-orange-950/50 to-violet-950/40 px-6 py-3 sm:items-start">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-orange-300/80">
                        Баланс
                      </span>
                      <span className="font-mono text-2xl font-black text-white">
                        {formatRub(me.balance)}{" "}
                        <span className="text-lg font-bold text-orange-400/90">₽</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Промокод */}
                <div className="mb-10 overflow-hidden rounded-2xl border border-violet-500/35 bg-gradient-to-br from-violet-950/40 via-[#0c1022] to-purple-950/30 p-6 sm:p-8">
                  <div className="mb-5 flex flex-wrap items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-900 text-xl shadow-lg shadow-violet-900/50">
                      %
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Промокод</h2>
                      <p className="text-sm text-zinc-500">Бонус на баланс за активацию кода</p>
                    </div>
                  </div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                    Промокод
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="ВВЕДИТЕ КОД"
                      className="min-h-[3rem] flex-1 rounded-xl border-2 border-violet-600/50 bg-[#070b14]/90 px-4 py-3 font-mono text-sm font-semibold tracking-wider text-white placeholder:text-zinc-600 shadow-inner transition focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                    <button
                      type="button"
                      disabled={promoBusy}
                      onClick={applyPromo}
                      className="min-h-[3rem] shrink-0 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-rose-600 px-8 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-orange-900/40 transition hover:brightness-110 disabled:opacity-50"
                    >
                      Применить
                    </button>
                  </div>
                  {promoMsg && (
                    <p className="mt-4 text-sm text-amber-200/90">{promoMsg}</p>
                  )}
                </div>

                {bestDrop && (
                  <div className="mb-10 overflow-hidden rounded-2xl border border-cb-stroke/50 bg-[#0a1020]/80 p-6 shadow-inner backdrop-blur-sm">
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-cb-flame/90">
                          Лучший дроп
                        </p>
                        <p className="mt-3 text-lg font-bold text-white">
                          {bestDrop.name}
                        </p>
                        <p className="mt-1 text-sm text-zinc-400">
                          Редкость: {bestDrop.rarity}
                        </p>
                        <p className="mt-2 font-mono text-2xl font-black text-cb-flame">
                          {formatRub(bestDrop.sellPrice)} ₽
                        </p>
                      </div>
                      <div
                        className={`relative h-20 w-20 overflow-hidden rounded-xl ring-1 ${
                          rarityClass[bestDrop.rarity] || rarityClass.common
                        }`}
                      >
                        <Image
                          src={bestDrop.image || "/logo.svg"}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative overflow-hidden rounded-2xl border border-cb-stroke/75 bg-cb-panel/40 bg-cb-mesh shadow-[inset_0_1px_0_rgba(255,49,49,0.06)]">
                  <div
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,transparent_42%,rgba(255,49,49,0.06)_50%,transparent_58%)]"
                    aria-hidden
                  />
                  <div className="relative px-4 pb-8 pt-8 sm:px-8">
                    <h2 className="text-center text-sm font-bold uppercase tracking-[0.28em] text-white sm:text-base">
                      Ваши предметы
                    </h2>

                    <div className="mt-6 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-cb-flame sm:text-[13px]">
                        <span className="flex h-4 w-4 items-center justify-center rounded border border-cb-flame/80 bg-cb-flame/15 text-[10px] leading-none text-cb-flame">
                          ✓
                        </span>
                        Весь дроп
                      </span>
                      <button
                        type="button"
                        disabled={!me.inventory.length || sellAllBusy}
                        onClick={() => {
                          void sellAll();
                        }}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cb-stroke/90 bg-black/45 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-200 shadow-md transition hover:border-cb-flame/50 hover:bg-red-950/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
                      >
                        <span aria-hidden className="text-base leading-none">
                          🪙
                        </span>
                        {me.inventory.length === 0
                          ? "Нет предметов для продажи"
                          : sellAllBusy
                            ? "Продаём…"
                            : `Продать всё за ${formatRub(inventorySellTotal)} ₽`}
                      </button>
                    </div>

                    {me.inventory.length > 0 ? (
                      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
                        {me.inventory.map((it) => {
                          const rk = normRarity(it.rarity);
                          const bar = rarityBar[rk] || rarityBar.common;
                          const { weapon, skin } = splitItemName(it.name);
                          const marketUrl = `https://steamcommunity.com/market/search?q=${encodeURIComponent(it.name)}`;
                          return (
                            <li
                              key={it.itemId}
                              className="group flex flex-col overflow-hidden rounded-xl border border-cb-stroke/70 bg-gradient-to-br from-[#06060c] via-[#08050a] to-black shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                            >
                              <div className="relative px-2 pb-0 pt-2">
                                <div className="absolute left-2 top-2 z-10 text-[15px] leading-none opacity-90">
                                  📦
                                </div>
                                <p className="truncate pl-7 text-right font-mono text-[11px] font-bold tabular-nums text-cb-flame sm:text-xs">
                                  {formatRub(it.sellPrice)} ₽
                                </p>
                                <div className="relative mx-auto mt-1 aspect-square w-[88%] max-w-[9.5rem]">
                                  {it.image ? (
                                    <Image
                                      src={it.image}
                                      alt=""
                                      fill
                                      className="object-contain p-1"
                                      sizes="(max-width: 640px) 45vw, 140px"
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-2xl text-zinc-700">
                                      ?
                                    </div>
                                  )}
                                </div>
                                <div className={`mx-auto mt-1 h-1 w-[92%] rounded-full ${bar}`} />
                              </div>
                              <div className="flex min-h-[3.25rem] flex-col justify-center px-2 py-2 text-center">
                                <p className="line-clamp-2 text-[11px] font-bold leading-tight text-white sm:text-xs">
                                  {weapon || it.name}
                                </p>
                                {skin ? (
                                  <p className="mt-0.5 line-clamp-2 text-[10px] font-medium text-zinc-400 sm:text-[11px]">
                                    {skin}
                                  </p>
                                ) : null}
                              </div>
                              <div className="mt-auto flex items-center justify-center gap-0.5 border-t border-cb-stroke/50 bg-black/45 px-1 py-2 sm:gap-1">
                                <button
                                  type="button"
                                  title="Скоро"
                                  disabled
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-cb-stroke/50 bg-black/30 text-zinc-600 opacity-50"
                                >
                                  <span className="text-[13px]" aria-hidden>
                                    📋
                                  </span>
                                </button>
                                <Link
                                  href="/upgrade"
                                  title="Апгрейд"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-cb-stroke/50 bg-black/30 text-zinc-400 transition hover:border-cb-flame/45 hover:text-cb-flame"
                                >
                                  <svg
                                    className="h-3.5 w-3.5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    aria-hidden
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5 5 5M7 17l5-5 5 5" />
                                  </svg>
                                </Link>
                                <button
                                  type="button"
                                  title="Продать"
                                  onClick={() => {
                                    void sell(it.itemId);
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-cb-stroke/50 bg-black/30 text-zinc-400 transition hover:border-cb-flame/45 hover:text-cb-flame"
                                >
                                  <span className="text-[13px]" aria-hidden>
                                    💰
                                  </span>
                                </button>
                                <a
                                  href={marketUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Поиск на Steam Market"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-cb-stroke/50 bg-black/30 text-zinc-400 transition hover:border-cb-flame/45 hover:text-cb-flame"
                                >
                                  <svg
                                    className="h-3.5 w-3.5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    aria-hidden
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M13.5 4.5H4.5A2.25 2.25 0 002.25 6.75v12A2.25 2.25 0 004.5 21h12a2.25 2.25 0 002.25-2.25V11.25M7.5 16.5L21 3m0 0h-5.25M21 3v5.25"
                                    />
                                  </svg>
                                </a>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="mt-10 rounded-xl border border-dashed border-cb-stroke/60 bg-black/25 px-6 py-14 text-center text-sm text-zinc-500">
                        Инвентарь пуст. Откройте кейс на главной.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-10 flex justify-center sm:justify-start">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-600 to-rose-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-orange-900/35 transition hover:brightness-110"
                  >
                    На главную
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
