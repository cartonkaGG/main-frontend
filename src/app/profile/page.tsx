"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { normRarity, rarityBar } from "@/components/CaseRoulette";
import { SiteShell } from "@/components/SiteShell";
import { apiFetch, clearToken, getToken } from "@/lib/api";
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
  isAdmin?: boolean;
  isSupportStaff?: boolean;
  stats?: {
    casesOpened: number;
    upgradesDone: number;
    itemsSold: number;
    soldTotalRub: number;
  };
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
    source?: "case" | "upgrade" | "inventory";
  };
};

type BestDrop = {
  name: string;
  image: string | null;
  rarity: string;
  sellPrice: number;
  source?: "case" | "upgrade" | "inventory";
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

const profileCard =
  "rounded-2xl border border-cb-stroke/60 bg-gradient-to-br from-[#0a0e14]/95 via-cb-panel/40 to-black/80 shadow-[inset_0_1px_0_rgba(255,49,49,0.07),0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-sm";

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
  const [tradeUrl, setTradeUrl] = useState("");
  const [tradeSavedFlash, setTradeSavedFlash] = useState(false);

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
    if (typeof window === "undefined") return;
    setTradeUrl(localStorage.getItem("cd_trade_url") || "");
  }, [me?.steamId]);

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
          source: me.bestEverItem.source,
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
                  source: "inventory",
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

  function saveTradeUrl() {
    if (typeof window === "undefined") return;
    localStorage.setItem("cd_trade_url", tradeUrl.trim());
    setTradeSavedFlash(true);
    window.setTimeout(() => setTradeSavedFlash(false), 2500);
  }

  function logoutProfile() {
    clearToken();
    window.location.href = "/";
  }

  function openTopUp() {
    window.dispatchEvent(new CustomEvent("cd-open-crypto-topup"));
  }

  return (
    <SiteShell>
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
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
                {(() => {
                  const st = me.stats ?? {
                    casesOpened: 0,
                    upgradesDone: 0,
                    itemsSold: 0,
                    soldTotalRub: 0,
                  };
                  const tradeOk = tradeUrl.trim().length > 20;
                  return (
                    <div className="mb-10 grid gap-4 lg:grid-cols-2 lg:gap-5">
                      {/* Trade URL */}
                      <div className={`${profileCard} flex flex-col p-5 sm:p-6`}>
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                              tradeOk
                                ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                                : "bg-zinc-800 text-zinc-500 ring-1 ring-cb-stroke/60"
                            }`}
                            aria-hidden
                          >
                            {tradeOk ? "✓" : "—"}
                          </span>
                          <div className="min-w-0">
                            <h2 className="text-sm font-black uppercase tracking-wide text-white">
                              Trade URL
                            </h2>
                            <p className="mt-1 text-xs text-zinc-500">
                              {tradeOk || tradeSavedFlash
                                ? "Трейд-ссылка сохранена локально в браузере"
                                : "Укажите ссылку для обмена (хранится только у вас)"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                          <input
                            value={tradeUrl}
                            onChange={(e) => setTradeUrl(e.target.value)}
                            placeholder="https://steamcommunity.com/tradeoffer/new/?partner=…"
                            className="min-h-[2.75rem] flex-1 rounded-xl border border-cb-stroke/70 bg-black/40 px-3 py-2 font-mono text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:border-cb-flame/50 focus:outline-none focus:ring-1 focus:ring-cb-flame/30 sm:text-xs"
                          />
                          <button
                            type="button"
                            onClick={saveTradeUrl}
                            className="shrink-0 rounded-xl border-2 border-cb-flame/60 bg-transparent px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-cb-flame/15"
                          >
                            Обновить
                          </button>
                        </div>
                        <a
                          href="https://steamcommunity.com/my/tradeoffers/privacy#trade_url"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-zinc-500 transition hover:text-cb-flame"
                        >
                          <span className="text-cb-flame/80" aria-hidden>
                            ?
                          </span>
                          Где взять trade-ссылку
                        </a>
                      </div>

                      {/* Профиль / баланс */}
                      <div className={`${profileCard} flex flex-col p-5 sm:p-6`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="text-lg opacity-90" aria-hidden>
                              🎮
                            </span>
                            <span className="truncate font-bold text-white">{me.displayName}</span>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            {me.isAdmin ? (
                              <Link
                                href="/admin/cases"
                                className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition hover:text-cb-flame"
                              >
                                ⚙ Админ
                              </Link>
                            ) : me.isSupportStaff ? (
                              <Link
                                href="/admin/support"
                                className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition hover:text-sky-300"
                              >
                                ⚙ Поддержка
                              </Link>
                            ) : null}
                            <button
                              type="button"
                              onClick={logoutProfile}
                              className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 transition hover:text-red-400"
                            >
                              Выход
                            </button>
                          </div>
                        </div>
                        <div className="relative mx-auto mt-5 flex justify-center">
                          <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-cb-flame/50 to-orange-600/30 opacity-70 blur-md" />
                          <div className="relative h-28 w-28 overflow-hidden rounded-full ring-2 ring-cb-flame/45 ring-offset-2 ring-offset-[#060a12] sm:h-32 sm:w-32">
                            {me.avatar ? (
                              <Image
                                src={me.avatar}
                                alt=""
                                width={128}
                                height={128}
                                className="h-full w-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-3xl text-zinc-600">
                                ?
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-cb-stroke/40 pt-4 text-sm">
                          <span className="text-zinc-500">
                            Предметов:{" "}
                            <span className="font-mono font-bold text-white">{me.inventory.length}</span>
                          </span>
                          <span className="font-mono text-lg font-black text-white">
                            {formatRub(me.balance)} ₽
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                          <a
                            href="#inventory"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition hover:text-cb-flame"
                          >
                            <span aria-hidden>🕐</span>
                            Инвентарь ниже
                          </a>
                          <button
                            type="button"
                            onClick={openTopUp}
                            className="inline-flex items-center gap-2 rounded-xl border-2 border-cb-flame/70 bg-cb-flame/10 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-cb-flame transition hover:bg-cb-flame/20"
                          >
                            + Пополнить
                          </button>
                        </div>
                      </div>

                      {/* Статистика */}
                      <div className={`${profileCard} p-5 sm:p-6`}>
                        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-white">
                          <span className="text-cb-flame" aria-hidden>
                            ▤
                          </span>
                          Статистика аккаунта
                        </h2>
                        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-xl border border-cb-stroke/50 bg-black/30 py-3">
                            <div className="text-lg" aria-hidden>
                              📦
                            </div>
                            <p className="mt-1 font-mono text-lg font-black text-cb-flame">{st.casesOpened}</p>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Кейсы</p>
                          </div>
                          <div className="rounded-xl border border-cb-stroke/50 bg-black/30 py-3">
                            <div className="text-lg" aria-hidden>
                              ⇈
                            </div>
                            <p className="mt-1 font-mono text-lg font-black text-cb-flame">{st.upgradesDone}</p>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Апгрейд</p>
                          </div>
                          <div className="rounded-xl border border-cb-stroke/50 bg-black/30 py-3">
                            <div className="text-lg" aria-hidden>
                              📋
                            </div>
                            <p className="mt-1 font-mono text-lg font-black text-cb-flame">{st.itemsSold}</p>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Продажи</p>
                          </div>
                        </div>
                        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                          Получено с продаж
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <span className="text-xl" aria-hidden>
                            🪙
                          </span>
                          <span className="font-mono text-xl font-black text-cb-flame">
                            {formatRub(st.soldTotalRub)} ₽
                          </span>
                          <span className="text-sm text-zinc-400">
                            {st.itemsSold}{" "}
                            {st.itemsSold === 1 ? "предмет" : st.itemsSold > 1 && st.itemsSold < 5 ? "предмета" : "предметов"}
                          </span>
                        </div>
                      </div>

                      {/* Лучший дроп */}
                      {bestDrop ? (
                        <div className={`${profileCard} p-5 sm:p-6`}>
                          <h2 className="text-center text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
                            Лучший дроп
                          </h2>
                          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-base font-bold leading-snug text-white sm:text-lg">
                                {bestDrop.name}
                              </p>
                              {bestDrop.source === "upgrade" ? (
                                <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cb-flame">
                                  Выпало в апгрейде
                                </p>
                              ) : null}
                              <p className="mt-2 text-xs text-zinc-500">Редкость: {bestDrop.rarity}</p>
                              <p className="mt-3 inline-flex rounded-full bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#dc2626] px-3 py-1 font-mono text-sm font-black tabular-nums text-white shadow-md">
                                {formatRub(bestDrop.sellPrice)}&nbsp;₽
                              </p>
                            </div>
                            <div
                              className={`relative mx-auto h-36 w-36 shrink-0 overflow-hidden rounded-xl ring-1 sm:h-40 sm:w-40 ${
                                rarityClass[bestDrop.rarity] || rarityClass.common
                              }`}
                            >
                              <Image
                                src={bestDrop.image || "/logo.svg"}
                                alt=""
                                fill
                                className="object-contain p-2"
                                unoptimized
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={`${profileCard} flex min-h-[200px] flex-col items-center justify-center p-6 text-center`}>
                          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Лучший дроп</p>
                          <p className="mt-3 max-w-xs text-sm text-zinc-600">
                            Откройте кейс или выиграйте апгрейд — лучший предмет появится здесь
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

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

                <div
                  id="inventory"
                  className="relative overflow-hidden rounded-2xl border border-cb-stroke/75 bg-cb-panel/40 bg-cb-mesh shadow-[inset_0_1px_0_rgba(255,49,49,0.06)]"
                >
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
