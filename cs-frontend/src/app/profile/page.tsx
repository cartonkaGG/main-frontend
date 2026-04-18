"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { normRarity, rarityBar, rarityCardFill } from "@/components/CaseRoulette";
import { FreeKassaBanner } from "@/components/FreeKassaBanner";
import { SiteShell } from "@/components/SiteShell";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import { requestAuthModal } from "@/lib/authModal";
import { RoundedZapIcon } from "@/components/icons/RoundedZapIcon";
import { SiteMoney } from "@/components/SiteMoney";
import { SitePriceBadge } from "@/components/SitePriceBadge";
import { formatSiteAmount } from "@/lib/money";
import { SITE_MONEY_CTA_CLASS } from "@/lib/siteMoneyStyles";
import { preferHighResSteamEconomyImage, SKIN_IMG_QUALITY_CLASS } from "@/lib/steamImage";

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
    marketPriceRub?: number | null;
    priceSource?: string;
    withdrawalPending?: boolean;
    caseSlug?: string;
    dmarketAssetId?: string;
    dmarketClassId?: string;
    dmarketGameId?: string;
    dmarketTitle?: string;
    exterior?: string;
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

type MyWithdrawalRow = {
  id: string;
  status: string;
  itemSnapshot?: { itemId?: string };
};

const rarityClass: Record<string, string> = {
  common: "border-zinc-600/80 bg-zinc-950/50 text-zinc-300",
  uncommon: "border-sky-400/50 bg-sky-950/25 text-sky-200",
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

function displayItemRub(it: Me["inventory"][number]): number {
  const m = Number(it.marketPriceRub);
  if (Number.isFinite(m) && m > 0) return m;
  return Number(it.sellPrice) || 0;
}

/** Скільки карток інвентаря на одній сторінці профілю. */
const INVENTORY_ITEMS_PER_PAGE = 12;

type InventoryPageToken = number | "ellipsis";

function buildInventoryPaginationPages(current: number, total: number): InventoryPageToken[] {
  if (total <= 1) return [1];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const delta = 1;
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);
  const out: InventoryPageToken[] = [1];
  if (left > 2) out.push("ellipsis");
  for (let i = left; i <= right; i++) out.push(i);
  if (right < total - 1) out.push("ellipsis");
  out.push(total);
  return out;
}

function InventoryPaginationBar({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const model = buildInventoryPaginationPages(currentPage, totalPages);
  const arrowCls =
    "flex h-9 min-w-9 items-center justify-center rounded-lg border border-cb-stroke/60 bg-zinc-950/80 text-sm font-bold text-zinc-200 transition hover:border-cb-flame/45 hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 sm:h-10 sm:min-w-10";
  const pageCls =
    "min-w-9 rounded-lg border px-2 py-1.5 text-center text-xs font-black tabular-nums transition sm:min-w-10 sm:text-sm";
  const pageIdle = `${pageCls} border-cb-stroke/55 bg-black/45 text-zinc-300 hover:border-cb-flame/40 hover:text-white`;
  const pageActive = `${pageCls} border-cb-flame/55 bg-red-950/35 text-cb-flame shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`;

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5"
      aria-label="Страницы инвентаря"
    >
      <button
        type="button"
        className={arrowCls}
        disabled={currentPage <= 1}
        aria-label="Предыдущая страница"
        onClick={() => onPageChange(currentPage - 1)}
      >
        &lt;
      </button>
      {model.map((token, idx) =>
        token === "ellipsis" ? (
          <span
            key={`e-${idx}`}
            className="flex h-9 min-w-8 items-center justify-center text-sm font-bold text-zinc-500 sm:h-10"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={token}
            type="button"
            className={token === currentPage ? pageActive : pageIdle}
            aria-label={`Страница ${token}`}
            aria-current={token === currentPage ? "page" : undefined}
            onClick={() => onPageChange(token)}
          >
            {token}
          </button>
        ),
      )}
      <button
        type="button"
        className={arrowCls}
        disabled={currentPage >= totalPages}
        aria-label="Следующая страница"
        onClick={() => onPageChange(currentPage + 1)}
      >
        &gt;
      </button>
    </nav>
  );
}

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
  const [withdrawItem, setWithdrawItem] = useState<Me["inventory"][number] | null>(null);
  const [withdrawTradeUrl, setWithdrawTradeUrl] = useState("");
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawErr, setWithdrawErr] = useState<string | null>(null);
  const [myWithdrawals, setMyWithdrawals] = useState<MyWithdrawalRow[]>([]);
  const [cancelWithdrawBusyId, setCancelWithdrawBusyId] = useState<string | null>(null);
  const [inventoryPage, setInventoryPage] = useState(1);

  /** Активні заявки з /api/withdrawals/mine — єдине джерело для «На выводе» / «Отменить», щоб не розходилось з /api/me. */
  const activeWithdrawalByItemId = useMemo(() => {
    const ACTIVE = new Set(["pending", "processing", "failed"]);
    const m = new Map<string, { status: string; id: string }>();
    for (const w of myWithdrawals) {
      const st = String(w.status || "").trim().toLowerCase();
      if (!ACTIVE.has(st)) continue;
      const iid = String(w.itemSnapshot?.itemId ?? "").trim();
      if (iid) m.set(iid, { status: st, id: w.id });
    }
    return m;
  }, [myWithdrawals]);

  const inventorySellTotal = useMemo(
    () =>
      (me?.inventory ?? []).reduce((s, it) => {
        if (activeWithdrawalByItemId.has(String(it.itemId ?? "").trim())) return s;
        return s + displayItemRub(it);
      }, 0),
    [me?.inventory, activeWithdrawalByItemId],
  );

  const sellableInventoryCount = useMemo(
    () =>
      (me?.inventory ?? []).filter((it) => !activeWithdrawalByItemId.has(String(it.itemId ?? "").trim()))
        .length,
    [me?.inventory, activeWithdrawalByItemId],
  );

  const inventoryTotalPages = useMemo(() => {
    const n = me?.inventory?.length ?? 0;
    if (n <= 0) return 1;
    return Math.max(1, Math.ceil(n / INVENTORY_ITEMS_PER_PAGE));
  }, [me?.inventory?.length]);

  const safeInventoryPage = Math.min(Math.max(1, inventoryPage), inventoryTotalPages);

  const inventoryPageItems = useMemo(() => {
    const inv = me?.inventory;
    if (!inv?.length) return [];
    const start = (safeInventoryPage - 1) * INVENTORY_ITEMS_PER_PAGE;
    return inv.slice(start, start + INVENTORY_ITEMS_PER_PAGE);
  }, [me?.inventory, safeInventoryPage]);

  useEffect(() => {
    setInventoryPage((p) => Math.max(1, Math.min(p, inventoryTotalPages)));
  }, [inventoryTotalPages]);

  const goInventoryPage = useCallback((p: number) => {
    setInventoryPage((prev) => {
      const next = Math.max(1, Math.min(p, inventoryTotalPages));
      if (next !== prev && typeof document !== "undefined") {
        requestAnimationFrame(() => {
          document.getElementById("inventory")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      return next;
    });
  }, [inventoryTotalPages]);

  const load = useCallback(async () => {
    if (!getToken()) {
      setMe(null);
      setErr(null);
      setMyWithdrawals([]);
      return;
    }
    const [rMe, rWd] = await Promise.all([
      apiFetch<Me>("/api/me"),
      apiFetch<{ withdrawals: MyWithdrawalRow[] }>("/api/withdrawals/mine"),
    ]);
    if (!rMe.ok) {
      setErr(rMe.error || "Ошибка");
      setMe(null);
      setMyWithdrawals([]);
      return;
    }
    setErr(null);
    setMe(rMe.data!);
    setMyWithdrawals(Array.isArray(rWd.data?.withdrawals) ? rWd.data!.withdrawals : []);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cd-withdrawals-mine-changed"));
    }
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
            const p = displayItemRub(it);
            const current = acc?.sellPrice ?? -Infinity;
            return p > current
              ? {
                  name: it.name,
                  image: it.image ?? null,
                  rarity: it.rarity,
                  sellPrice: p,
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
      setPromoMsg(`Начислено ${formatSiteAmount(r.data?.granted ?? 0)}`);
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

  async function submitWithdraw() {
    if (!withdrawItem || withdrawBusy) return;
    if (!getToken()) {
      requestAuthModal("/profile");
      return;
    }
    const u = withdrawTradeUrl.trim();
    const low = u.toLowerCase();
    if (
      u.length < 40 ||
      !low.includes("steamcommunity.com") ||
      (!low.includes("tradeoffer/new") && (!low.includes("partner=") || !low.includes("token=")))
    ) {
      setWithdrawErr("Укажите полную Steam trade-ссылку (partner и token)");
      return;
    }
    setWithdrawBusy(true);
    setWithdrawErr(null);
    const r = await apiFetch<{ withdrawal?: { id: string } }>("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: withdrawItem.itemId, tradeUrl: u }),
    });
    setWithdrawBusy(false);
    if (!r.ok) {
      setWithdrawErr(r.error || "Ошибка");
      return;
    }
    setWithdrawItem(null);
    await load();
    alert("Заявка на вывод создана. Админ подтвердит покупку на Market.csgo и отправку на ваш trade URL.");
  }

  async function cancelMyWithdraw(withdrawalId: string) {
    if (!getToken() || cancelWithdrawBusyId) return;
    if (
      !window.confirm(
        "Отменить заявку на вывод? Предмет снова можно продать или подать заявку заново.",
      )
    ) {
      return;
    }
    setCancelWithdrawBusyId(withdrawalId);
    const r = await apiFetch(`/api/withdrawals/${encodeURIComponent(withdrawalId)}/cancel`, {
      method: "POST",
    });
    setCancelWithdrawBusyId(null);
    if (!r.ok) {
      alert(r.error || "Не удалось отменить");
      return;
    }
    await load();
    window.dispatchEvent(new CustomEvent("cd-balance-updated"));
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
                            <SiteMoney value={me.balance} iconClassName="h-[1.05em] w-[1.05em] text-cb-flame" />
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
                            className={`${SITE_MONEY_CTA_CLASS} gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider`}
                          >
                            + Пополнить
                          </button>
                        </div>
                        <div className="mt-4 flex justify-center border-t border-cb-stroke/35 pt-4">
                          <FreeKassaBanner imgClassName="max-h-16 sm:max-h-20" />
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
                            <SiteMoney value={st.soldTotalRub} iconClassName="h-[1.05em] w-[1.05em] text-cb-flame" />
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
                              <div className="mt-3">
                                <SitePriceBadge value={bestDrop.sellPrice} size="md" />
                              </div>
                            </div>
                            <div
                              className={`relative mx-auto h-36 w-36 shrink-0 overflow-hidden rounded-xl ring-1 sm:h-40 sm:w-40 ${
                                rarityClass[bestDrop.rarity] || rarityClass.common
                              }`}
                            >
                              <Image
                                src={
                                  bestDrop.image
                                    ? (preferHighResSteamEconomyImage(bestDrop.image) ?? bestDrop.image)
                                    : "/logo.svg"
                                }
                                alt=""
                                fill
                                className={`object-contain p-2 ${bestDrop.image ? SKIN_IMG_QUALITY_CLASS : ""}`}
                                quality={100}
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
                      className={`${SITE_MONEY_CTA_CLASS} min-h-[3rem] shrink-0 px-8 text-sm font-black uppercase tracking-wider disabled:opacity-50`}
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
                  className="relative overflow-hidden rounded-2xl border border-cb-stroke/70 bg-gradient-to-b from-[#0a0a0f]/95 via-cb-panel/50 to-black/90 bg-cb-mesh shadow-[inset_0_1px_0_rgba(255,49,49,0.08),0_20px_60px_rgba(0,0,0,0.35)]"
                >
                  <div
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,transparent_40%,rgba(255,49,49,0.07)_50%,transparent_60%)]"
                    aria-hidden
                  />
                  <div className="relative px-4 pb-8 pt-8 sm:px-8">
                    <div className="mx-auto max-w-xl text-center">
                      <h2 className="text-base font-black uppercase tracking-[0.22em] text-white sm:text-lg">
                        Ваши предметы
                      </h2>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-500 sm:text-sm">
                        Продайте на баланс, выведите через админа или отправьте в апгрейд
                      </p>
                    </div>

                    <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <span className="inline-flex items-center justify-center gap-2 rounded-full border border-cb-flame/25 bg-red-950/20 px-3 py-1.5 text-[11px] font-semibold text-cb-flame/95 sm:justify-start sm:text-xs">
                        <RoundedZapIcon className="h-3.5 w-3.5 shrink-0 text-cb-flame" aria-hidden />
                        Весь дроп с кейсов и апгрейдов
                      </span>
                      <button
                        type="button"
                        disabled={!sellableInventoryCount || sellAllBusy}
                        onClick={() => {
                          void sellAll();
                        }}
                        className={`${SITE_MONEY_CTA_CLASS} min-h-[2.75rem] shrink-0 px-4 py-2.5 text-xs font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:text-sm`}
                      >
                        <RoundedZapIcon className="h-[1.05em] w-[1.05em] shrink-0 text-white opacity-95" aria-hidden />
                        {me.inventory.length === 0
                          ? "Нет предметов для продажи"
                          : !sellableInventoryCount
                            ? "Все предметы на выводе"
                            : sellAllBusy
                              ? "Продаём…"
                              : (
                                <>
                                  Продать всё за{" "}
                                  <SiteMoney value={inventorySellTotal} iconClassName="h-[1.1em] w-[1.1em] text-white" />
                                </>
                              )}
                      </button>
                    </div>

                    {me.inventory.length > INVENTORY_ITEMS_PER_PAGE ? (
                      <div className="mt-6 space-y-2 border-b border-cb-stroke/30 pb-6">
                        <p className="text-center text-[11px] tabular-nums text-zinc-500 sm:text-xs">
                          {(() => {
                            const total = me.inventory.length;
                            const from = (safeInventoryPage - 1) * INVENTORY_ITEMS_PER_PAGE + 1;
                            const to = Math.min(safeInventoryPage * INVENTORY_ITEMS_PER_PAGE, total);
                            if (from === to) {
                              return (
                                <>
                                  Показан <span className="font-semibold text-zinc-400">{from}</span>-й предмет из{" "}
                                  <span className="font-semibold text-zinc-400">{total}</span>
                                </>
                              );
                            }
                            return (
                              <>
                                Показаны предметы{" "}
                                <span className="font-semibold text-zinc-400">
                                  {from}–{to}
                                </span>{" "}
                                из <span className="font-semibold text-zinc-400">{total}</span>
                              </>
                            );
                          })()}
                        </p>
                        <InventoryPaginationBar
                          currentPage={safeInventoryPage}
                          totalPages={inventoryTotalPages}
                          onPageChange={goInventoryPage}
                        />
                      </div>
                    ) : null}

                    {me.inventory.length > 0 ? (
                      <ul className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 md:gap-3 lg:grid-cols-5 lg:gap-3 xl:grid-cols-6">
                        {inventoryPageItems.map((it) => {
                          const rk = normRarity(it.rarity);
                          const bar = rarityBar[rk] || rarityBar.common;
                          const fill = rarityCardFill[rk] || rarityCardFill.common;
                          const { weapon, skin } = splitItemName(it.name);
                          const itemKey = String(it.itemId ?? "").trim();
                          const wdAct = activeWithdrawalByItemId.get(itemKey);
                          const locked = Boolean(wdAct);
                          const pendingWdId = wdAct?.status === "pending" ? wdAct.id : null;
                          const showRub = displayItemRub(it);
                          const priceTitle =
                            it.marketPriceRub != null && it.marketPriceRub > 0
                              ? "Ориентир market.csgo; продажа по цене сайта — другая сумма"
                              : undefined;
                          return (
                            <li
                              key={it.itemId}
                              className={`group flex flex-col overflow-hidden rounded-lg border border-cb-stroke/55 shadow-[0_10px_28px_rgba(0,0,0,0.38)] ring-1 ring-black/40 transition hover:border-cb-stroke/80 ${fill} ${locked ? "ring-amber-500/30" : ""}`}
                            >
                              <div className="relative px-1.5 pb-0.5 pt-1.5 sm:px-2 sm:pb-1 sm:pt-2">
                                <div className="absolute left-1.5 top-1.5 z-10 max-w-[calc(100%-3rem)] sm:left-2 sm:top-2 sm:max-w-[calc(100%-3.5rem)]">
                                  <SitePriceBadge
                                    value={showRub}
                                    size="sm"
                                    title={priceTitle}
                                    className="!scale-[0.88] !origin-top-left sm:!scale-95"
                                  />
                                </div>
                                {locked ? (
                                  <div className="absolute right-1.5 top-1.5 z-10 max-w-[4.75rem] text-right sm:right-2 sm:top-2 sm:max-w-[5.5rem]">
                                    <p className="rounded border border-amber-500/35 bg-amber-950/50 px-1 py-0.5 text-[7px] font-bold uppercase leading-tight tracking-wide text-amber-200/95 sm:rounded-md sm:px-1.5 sm:text-[8px]">
                                      На выводе
                                    </p>
                                    {pendingWdId ? (
                                      <button
                                        type="button"
                                        disabled={cancelWithdrawBusyId === pendingWdId}
                                        onClick={() => void cancelMyWithdraw(pendingWdId)}
                                        className="mt-0.5 block w-full text-[7px] font-bold text-sky-400 underline decoration-sky-500/40 underline-offset-2 transition hover:text-sky-300 disabled:opacity-50 sm:mt-1 sm:text-[8px]"
                                      >
                                        {cancelWithdrawBusyId === pendingWdId ? "…" : "Отменить"}
                                      </button>
                                    ) : null}
                                  </div>
                                ) : null}
                                <div className="relative mx-auto mt-6 aspect-square w-[86%] max-w-[6.75rem] sm:mt-7 sm:max-w-[7.75rem]">
                                  {it.image ? (
                                    <Image
                                      src={preferHighResSteamEconomyImage(it.image) ?? it.image}
                                      alt=""
                                      fill
                                      className={`object-contain p-0.5 drop-shadow-[0_6px_18px_rgba(0,0,0,0.4)] sm:p-1 ${SKIN_IMG_QUALITY_CLASS}`}
                                      sizes="(max-width: 640px) 40vw, 110px"
                                      quality={100}
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-lg text-zinc-700 sm:text-2xl">
                                      ?
                                    </div>
                                  )}
                                </div>
                                <div className={`mx-auto mt-1.5 h-0.5 w-[88%] rounded-full sm:mt-2 sm:h-1 sm:w-[90%] ${bar}`} />
                              </div>
                              <div className="flex min-h-[2.5rem] flex-col justify-center px-1.5 py-1 text-center sm:min-h-[2.75rem] sm:px-2 sm:py-1.5">
                                <p className="line-clamp-2 text-[10px] font-bold leading-tight text-white sm:text-[11px]">
                                  {weapon || it.name}
                                </p>
                                {skin ? (
                                  <p className="mt-0.5 line-clamp-2 text-[9px] font-medium text-zinc-300/95 sm:text-[10px]">
                                    {skin}
                                  </p>
                                ) : null}
                                {it.exterior ? (
                                  <p className="mt-0.5 line-clamp-1 text-[8px] capitalize text-zinc-500 sm:text-[9px]">
                                    {it.exterior}
                                  </p>
                                ) : null}
                              </div>
                              <div className="mt-auto space-y-1 border-t border-cb-stroke/45 bg-black/55 p-1.5 sm:space-y-1.5 sm:p-2">
                                <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                                  <button
                                    type="button"
                                    title={locked ? "Предмет на выводе" : "Заявка на вывод"}
                                    disabled={locked}
                                    onClick={() => {
                                      if (locked) return;
                                      setWithdrawErr(null);
                                      setWithdrawTradeUrl(tradeUrl.trim());
                                      setWithdrawItem(it);
                                    }}
                                    className="rounded-md border border-cb-stroke/60 bg-zinc-950/80 py-1.5 text-[8px] font-black uppercase tracking-wide text-zinc-300 transition hover:border-cb-flame/45 hover:bg-zinc-900/90 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 sm:rounded-lg sm:py-2 sm:text-[9px] md:text-[10px]"
                                  >
                                    Вывод
                                  </button>
                                  {locked ? (
                                    <span className="flex cursor-not-allowed items-center justify-center rounded-md border border-cb-stroke/40 bg-black/30 py-1.5 text-[8px] font-black uppercase tracking-wide text-zinc-600 opacity-50 sm:rounded-lg sm:py-2 sm:text-[9px] md:text-[10px]">
                                      Апгрейд
                                    </span>
                                  ) : (
                                    <Link
                                      href="/upgrade"
                                      title="Апгрейд"
                                      className="flex items-center justify-center rounded-md border border-cb-stroke/60 bg-zinc-950/80 py-1.5 text-center text-[8px] font-black uppercase tracking-wide text-zinc-300 transition hover:border-cb-flame/45 hover:bg-zinc-900/90 hover:text-white sm:rounded-lg sm:py-2 sm:text-[9px] md:text-[10px]"
                                    >
                                      Апгрейд
                                    </Link>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  title={locked ? "Предмет на выводе" : "Продать на баланс"}
                                  disabled={locked}
                                  onClick={() => {
                                    if (locked) return;
                                    void sell(it.itemId);
                                  }}
                                  className="flex w-full items-center justify-center gap-0.5 rounded-md bg-gradient-to-b from-red-500 to-[#b91c1c] py-1.5 text-[8px] font-black uppercase tracking-wide text-white shadow-[0_3px_10px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-35 sm:gap-1 sm:rounded-lg sm:py-2 sm:text-[9px] md:gap-1.5 md:text-[10px]"
                                >
                                  <RoundedZapIcon className="h-2.5 w-2.5 shrink-0 text-white opacity-95 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" aria-hidden />
                                  Продать
                                  <SiteMoney
                                    value={showRub}
                                    className="text-[8px] font-black text-white sm:text-[9px] md:text-[10px]"
                                    iconClassName="h-2 w-2 text-white sm:h-2.5 sm:w-2.5 md:h-3 md:w-3"
                                  />
                                </button>
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

                    {me.inventory.length > INVENTORY_ITEMS_PER_PAGE ? (
                      <div className="mt-8 border-t border-cb-stroke/30 pt-6">
                        <InventoryPaginationBar
                          currentPage={safeInventoryPage}
                          totalPages={inventoryTotalPages}
                          onPageChange={goInventoryPage}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-10 flex justify-center sm:justify-start">
                  <Link
                    href="/"
                    className={`${SITE_MONEY_CTA_CLASS} px-8 py-3`}
                  >
                    На главную
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {withdrawItem ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Закрити"
            disabled={withdrawBusy}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm disabled:cursor-wait"
            onClick={() => {
              if (!withdrawBusy) setWithdrawItem(null);
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-cb-stroke/80 bg-[#0a0e14] p-5 shadow-2xl shadow-black/60 sm:p-6">
            <h3 className="text-sm font-black uppercase tracking-wide text-white">Вывод предмета</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              Заявка попадёт к админу. После подтверждения с вашего аккаунта market.csgo выполняется покупка лота
              (buy-for) и обмен на указанный trade URL. Убедитесь, что ссылка актуальна и на маркете достаточно
              средств.
            </p>
            <p className="mt-2 rounded-lg border border-amber-600/35 bg-amber-950/25 px-3 py-2 text-[11px] leading-snug text-amber-200/95">
              В Steam откройте инвентарь для всех:{" "}
              <span className="font-semibold text-amber-100">Профиль → Редактировать профиль → Конфиденциальность</span> — пункт
              про инвентарь должен быть <span className="font-semibold">«Открытый»</span> (Public). Иначе биржа не отправит
              обмен.
            </p>
            <p className="mt-3 line-clamp-2 text-sm font-semibold text-zinc-200">{withdrawItem.name}</p>
            <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Steam trade URL
            </label>
            <input
              value={withdrawTradeUrl}
              onChange={(e) => setWithdrawTradeUrl(e.target.value)}
              placeholder="https://steamcommunity.com/tradeoffer/new/?partner=…&token=…"
              className="mt-1.5 w-full rounded-xl border border-cb-stroke/70 bg-black/50 px-3 py-2.5 font-mono text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:border-cb-flame/50 focus:outline-none focus:ring-1 focus:ring-cb-flame/30"
            />
            {withdrawErr ? (
              <p className="mt-3 text-xs text-red-400">{withdrawErr}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={withdrawBusy}
                onClick={() => setWithdrawItem(null)}
                className="rounded-xl border border-cb-stroke bg-black/40 px-4 py-2 text-xs font-semibold text-zinc-400 transition hover:text-white disabled:opacity-50"
              >
                Скасувати
              </button>
              <button
                type="button"
                disabled={withdrawBusy}
                onClick={() => void submitWithdraw()}
                className="rounded-xl border-2 border-cb-flame/60 bg-cb-flame/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-cb-flame/20 disabled:opacity-50"
              >
                {withdrawBusy ? "Отправка…" : "Подать заявку"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SiteShell>
  );
}
