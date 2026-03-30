"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SiteShell } from "@/components/SiteShell";
import { apiFetch, getToken } from "@/lib/api";
import { requestAuthModal } from "@/lib/authModal";
import { formatRub } from "@/lib/money";

type Me = {
  displayName: string;
  avatar: string;
  balance: number;
  inventory: {
    itemId: string;
    name: string;
    image: string;
    rarity: string;
    sellPrice: number;
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

                <h2 className="mb-5 flex items-center gap-3 text-lg font-bold text-white">
                  <span className="h-px w-8 bg-gradient-to-r from-orange-500 to-transparent" />
                  Инвентарь
                </h2>

                {me.inventory.length > 0 ? (
                  <ul className="space-y-3">
                    {me.inventory.map((it) => (
                      <li
                        key={it.itemId}
                        className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-4 backdrop-blur-sm transition hover:border-orange-500/25 ${
                          rarityClass[it.rarity] || rarityClass.common
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-black/40 ring-1 ring-cb-stroke/60">
                            {it.image ? (
                              <Image
                                src={it.image}
                                alt=""
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                                —
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-100">{it.name}</p>
                            <p className="text-xs text-zinc-500">
                              Продажа: {formatRub(it.sellPrice)} ₽
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => sell(it.itemId)}
                          className="rounded-lg border border-orange-500/40 bg-orange-950/30 px-4 py-2 text-sm font-semibold text-orange-200 transition hover:bg-orange-900/40"
                        >
                          Продать
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-700/80 bg-black/20 px-6 py-10 text-center text-sm text-zinc-500">
                    Инвентарь пуст. Откройте кейс на сайте.
                  </div>
                )}

                <div className="mt-10 flex justify-center sm:justify-start">
                  <Link
                    href="/cases"
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-600 to-rose-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-orange-900/35 transition hover:brightness-110"
                  >
                    К кейсам
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
