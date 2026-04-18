"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatSiteAmount } from "@/lib/money";
import { preferHighResSteamEconomyImage, SKIN_IMG_QUALITY_CLASS } from "@/lib/steamImage";

type InventoryItem = {
  itemId: string;
  caseSlug?: string;
  name: string;
  image: string;
  rarity: string;
  sellPrice: number;
  obtainedAt?: string;
  dmarketTitle?: string;
  dmarketAssetId?: string;
  exterior?: string;
};

type CaseOpenLog = {
  at: string;
  steamId: string;
  caseSlug: string;
  caseName: string;
  pricePaid?: number;
  itemName: string;
  rarity: string;
  image: string | null;
  sellPrice: number;
  winIndex: number;
};

type SellLog = {
  at: string;
  steamId: string;
  itemId: string;
  caseSlug: string;
  name: string;
  rarity: string;
  sellPrice: number;
  image: string | null;
};

type PromoLog = {
  promoId: string;
  userSub: string;
  at: string;
  grant: number;
  rewardType?: string;
  depositPercent?: number;
};

type DepositOrderRow = {
  orderId: string;
  createdAt: string;
  credited: boolean;
  creditedAt: string | null;
  creditRubBase: number;
  amountUsd: number;
  paymentId: string | null;
  depositPercent: number;
  promoId: string | null;
};

type WithdrawalHistoryRow = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  itemName: string;
  itemSellPrice: number;
  transferId: string;
  lastError: string;
  resolvedAt: string;
};

type UpgradeLogRow = {
  at: string;
  win: boolean;
  stakeTotal: number;
  inputSum: number;
  balanceBoostRub: number;
  targetName: string;
  targetPrice: number;
  targetRarity: string;
  chancePct: number;
};

type AdminUserResponse = {
  user: {
    steamId: string;
    displayName: string;
    username?: string;
    avatar: string;
    role: string;
    balance: number;
    totalWon: number;
    totalSpent: number;
    battlesPlayed: number;
    battleWins: number;
    battlesLosses: number;
    /** Mongo _id або id у memory */
    userId?: string;
    createdAt?: string | null;
    updatedAt?: string | null;
    upgradeRunBaseline?: number | null;
    legalAcceptance?: {
      termsVersion: number | null;
      privacyVersion: number | null;
      cookiesVersion: number | null;
      acceptedAt: string | null;
    } | null;
    /** Останній рядок у Mongo LegalAcceptanceLog */
    legalAcceptanceAudit?: {
      acceptedAt: string | null;
      termsVersion: number | null;
      privacyVersion: number | null;
      cookiesVersion: number | null;
      loggedAt: string | null;
    } | null;
    inventory: InventoryItem[];
    bestItem: InventoryItem | null;
  };
  logs: {
    caseOpens: CaseOpenLog[];
    promoLogs: PromoLog[];
    sellLogs: SellLog[];
    upgradeLogs?: UpgradeLogRow[];
    depositOrders: DepositOrderRow[];
    withdrawals: WithdrawalHistoryRow[];
  };
  derived: {
    net: number;
  };
};

type AdminUsersSummary = {
  totalBalance: number;
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

export default function AdminUsersPage() {
  const [steamId, setSteamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<AdminUserResponse | null>(null);
  const [balanceAction, setBalanceAction] = useState<"set" | "add" | "deduct">("set");
  const [balanceValue, setBalanceValue] = useState<string>("0");
  const [balanceBusy, setBalanceBusy] = useState(false);
  const [balanceErr, setBalanceErr] = useState<string | null>(null);
  const [roleBusy, setRoleBusy] = useState(false);
  const [roleErr, setRoleErr] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<"user" | "support" | "admin">("user");

  const [summary, setSummary] = useState<AdminUsersSummary | null>(null);
  const [summaryErr, setSummaryErr] = useState<string | null>(null);

  const isValid = useMemo(() => {
    const s = steamId.trim();
    return /^\d+$/.test(s);
  }, [steamId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q && q.trim()) setSteamId(q.trim());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await apiFetch<AdminUsersSummary>("/api/admin/users/summary");
      if (!r.ok) {
        if (!cancelled) setSummaryErr(r.error || "Не удалось загрузить сводку");
        return;
      }
      if (!cancelled) {
        setSummary(r.data || null);
        setSummaryErr(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!data?.user?.role) return;
    const r = data.user.role;
    setPendingRole(r === "admin" ? "admin" : r === "support" ? "support" : "user");
  }, [data?.user?.role]);

  async function loadUser() {
    const sid = steamId.trim();
    if (!sid) return;
    if (!/^\d+$/.test(sid)) {
      setErr("SteamId должен быть числом");
      return;
    }
    setBusy(true);
    setErr(null);
    setData(null);
    const r = await apiFetch<AdminUserResponse>(`/api/admin/users/${sid}`);
    setBusy(false);
    if (!r.ok) {
      setErr(r.error || "Не удалось загрузить");
      return;
    }
    setData(r.data || null);
    if (r.data?.user?.balance != null) {
      setBalanceValue(String(r.data.user.balance));
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Пользователи</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-cb-stroke bg-gradient-to-br from-black/70 via-cb-panel/80 to-amber-950/40 p-4 shadow-inner">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-300/80">
            Суммарный баланс пользователей
          </p>
          {summary ? (
            <p className="mt-2 font-mono text-2xl font-black text-white">
              {formatSiteAmount(summary.totalBalance)}
            </p>
          ) : summaryErr ? (
            <p className="mt-2 text-xs text-red-300">{summaryErr}</p>
          ) : (
            <p className="mt-2 text-xs text-zinc-400">Загрузка…</p>
          )}
          <p className="mt-1 text-[11px] text-zinc-500">
            Считается по полю <span className="font-mono text-zinc-300">balance</span> всех аккаунтов.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-cb-stroke bg-cb-panel/30 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <input
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            placeholder="STEAM_ID (пример: 7656119...)"
            className="min-h-[3rem] flex-1 rounded-xl border border-cb-stroke bg-black/30 px-4 py-3 font-mono text-sm text-white placeholder:text-zinc-600 outline-none focus:border-orange-500/60"
          />
          <button
            type="button"
            disabled={busy || !isValid}
            onClick={loadUser}
            className="min-h-[3rem] shrink-0 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-rose-600 px-8 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-orange-900/40 transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Загрузка…" : "Показать"}
          </button>
        </div>
        {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
      </div>

      {data && (
        <div className="space-y-8">
          <div className="rounded-2xl border border-cb-stroke bg-[#0a1020]/80 p-6 shadow-inner backdrop-blur-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 overflow-hidden rounded-xl ring-1 ring-cb-stroke/60 bg-black/40">
                  <Image
                    src={data.user.avatar || "/logo.svg"}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-white">{data.user.displayName}</p>
                  <p className="mt-1 font-mono text-xs text-zinc-500">Steam ID: {data.user.steamId}</p>
                  {data.user.username && data.user.username !== data.user.displayName ? (
                    <p className="mt-0.5 text-xs text-zinc-400">username: {data.user.username}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-amber-400/90">Роль: {data.user.role}</p>
                  {data.user.userId ? (
                    <p className="mt-1 font-mono text-[10px] text-zinc-600">userId: {data.user.userId}</p>
                  ) : null}
                  {(data.user.createdAt || data.user.updatedAt) && (
                    <p className="mt-1 text-[10px] text-zinc-600">
                      {data.user.createdAt
                        ? `создан: ${data.user.createdAt.replace("T", " ").slice(0, 19)}`
                        : null}
                      {data.user.createdAt && data.user.updatedAt ? " · " : ""}
                      {data.user.updatedAt
                        ? `обновлён: ${data.user.updatedAt.replace("T", " ").slice(0, 19)}`
                        : null}
                    </p>
                  )}
                  {data.user.upgradeRunBaseline != null && Number.isFinite(data.user.upgradeRunBaseline) ? (
                    <p className="mt-1 text-[10px] text-violet-400/90">
                      upgrade baseline: {formatSiteAmount(data.user.upgradeRunBaseline)}
                    </p>
                  ) : null}
                  <div className="mt-3 rounded-xl border border-cb-stroke/80 bg-black/35 p-3 sm:p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Умови використання сайту
                    </p>
                    {data.user.legalAcceptance ? (
                      <>
                        <p className="mt-2 text-sm font-semibold text-emerald-300/95">
                          Користувач погодився з умовами використання сайту
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          У профілі збережено прийняті версії документів (користувача в БД).
                        </p>
                        <p className="mt-2 font-mono text-[11px] leading-relaxed text-emerald-200/85">
                          Користувацька угода: v{data.user.legalAcceptance.termsVersion ?? "—"} ·
                          Конфіденційність: v{data.user.legalAcceptance.privacyVersion ?? "—"} · Cookie: v
                          {data.user.legalAcceptance.cookiesVersion ?? "—"}
                        </p>
                        {data.user.legalAcceptance.acceptedAt ? (
                          <p className="mt-1 text-[11px] text-zinc-500">
                            Час прийняття:{" "}
                            {data.user.legalAcceptance.acceptedAt.replace("T", " ").slice(0, 19)} UTC
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-zinc-500">
                        Немає запису про згоду (старий акаунт або режим без Mongo).
                      </p>
                    )}
                    {data.user.legalAcceptanceAudit ? (
                      <div className="mt-3 border-t border-white/10 pt-3">
                        <p className="text-xs font-semibold text-sky-300/90">
                          Дубль у журналі БД (колекція LegalAcceptanceLog)
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-zinc-400">
                          v{data.user.legalAcceptanceAudit.termsVersion ?? "—"} / v
                          {data.user.legalAcceptanceAudit.privacyVersion ?? "—"} / v
                          {data.user.legalAcceptanceAudit.cookiesVersion ?? "—"}
                        </p>
                        {data.user.legalAcceptanceAudit.loggedAt ? (
                          <p className="mt-0.5 text-[10px] text-zinc-600">
                            запис у журнал:{" "}
                            {data.user.legalAcceptanceAudit.loggedAt.replace("T", " ").slice(0, 19)} UTC
                          </p>
                        ) : null}
                      </div>
                    ) : data.user.legalAcceptance ? (
                      <p className="mt-2 text-[10px] text-amber-200/80">
                        Журнал LegalAcceptanceLog порожній або Mongo недоступна — у профілі згода все одно
                        збережена.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="grid w-full max-w-xl grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-300/80">Баланс</p>
                  <p className="mt-0.5 font-mono text-lg font-black text-white">
                    {formatSiteAmount(data.user.balance)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Роль</p>
                  <p className="mt-0.5 font-medium text-zinc-200">{data.user.role || "user"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Потрачено / выиграно
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-zinc-300">
                    {formatSiteAmount(data.user.totalSpent)} / {formatSiteAmount(data.user.totalWon)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Бои (в / всего)</p>
                  <p className="mt-0.5 font-mono text-xs text-zinc-300">
                    {data.user.battleWins} / {data.user.battlesPlayed}
                    {data.user.battlesLosses > 0 ? (
                      <span className="text-zinc-600"> (пор: {data.user.battlesLosses})</span>
                    ) : null}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Нетто (derived)</p>
                  <p className="mt-0.5 font-mono text-xs font-semibold text-cb-flame">
                    {formatSiteAmount(data.derived.net)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Инвентарь</p>
                  <p className="mt-0.5 font-mono text-xs text-zinc-300">{data.user.inventory.length} шт.</p>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-cb-stroke/50 bg-black/20 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Управление балансом</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Доступно только админам. Значения влияют на баланс пользователя.
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-zinc-500">Действие</span>
                    <select
                      value={balanceAction}
                      onChange={(e) =>
                        setBalanceAction(
                          e.target.value as "set" | "add" | "deduct",
                        )
                      }
                      className="min-h-[2.7rem] rounded-xl border border-cb-stroke bg-black/30 px-3 py-2 text-sm text-white"
                    >
                      <option value="set">Установить баланс</option>
                      <option value="add">Добавить</option>
                      <option value="deduct">Снять</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-zinc-500">Значение (SC)</span>
                    <input
                      value={balanceValue}
                      onChange={(e) => setBalanceValue(e.target.value)}
                      inputMode="decimal"
                      className="min-h-[2.7rem] w-36 rounded-xl border border-cb-stroke bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:border-orange-500/60"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={balanceBusy || !steamId.trim()}
                    onClick={async () => {
                      setBalanceBusy(true);
                      setBalanceErr(null);
                      try {
                        const val = Number(balanceValue);
                        if (!Number.isFinite(val)) {
                          setBalanceErr("Значение должно быть числом");
                          return;
                        }
                        const sid = steamId.trim();
                        const body: { action: typeof balanceAction; balance?: number; amount?: number } = {
                          action: balanceAction,
                        };
                        if (balanceAction === "set") body.balance = val;
                        else body.amount = val;

                        const r = await apiFetch(
                          `/api/admin/users/${sid}/balance`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(body),
                          },
                        );
                        if (!r.ok) {
                          setBalanceErr(r.error || "Ошибка");
                          return;
                        }
                        await loadUser();
                      } finally {
                        setBalanceBusy(false);
                      }
                    }}
                    className="min-h-[2.7rem] rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-rose-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-orange-900/40 transition hover:brightness-110 disabled:opacity-50"
                  >
                    {balanceBusy ? "Применяем…" : "Применить"}
                  </button>
                </div>
              </div>
              {balanceErr && (
                <p className="mt-3 text-sm text-red-300">{balanceErr}</p>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-cb-stroke/50 bg-black/20 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Управление правами</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Пользователь, саппорт (только обращения) или полный админ.
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-zinc-500">Роль</span>
                    <select
                      value={pendingRole}
                      onChange={(e) =>
                        setPendingRole(e.target.value as "user" | "support" | "admin")
                      }
                      className="min-h-[2.7rem] rounded-xl border border-cb-stroke bg-black/30 px-3 py-2 text-sm text-white"
                    >
                      <option value="user">Пользователь</option>
                      <option value="support">Саппорт</option>
                      <option value="admin">Админ</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={
                      roleBusy ||
                      pendingRole ===
                        (data.user.role === "admin"
                          ? "admin"
                          : data.user.role === "support"
                            ? "support"
                            : "user")
                    }
                    onClick={async () => {
                      setRoleBusy(true);
                      setRoleErr(null);
                      try {
                        const sid = steamId.trim();
                        const r = await apiFetch<{ ok: boolean; role: string }>(
                          `/api/admin/users/${sid}/role`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ role: pendingRole }),
                          },
                        );
                        if (!r.ok) {
                          setRoleErr(r.error || "Ошибка");
                          return;
                        }
                        await loadUser();
                      } finally {
                        setRoleBusy(false);
                      }
                    }}
                    className="min-h-[2.7rem] rounded-xl border border-violet-500/60 bg-violet-950/40 px-5 py-2 text-sm font-bold text-violet-200 transition hover:bg-violet-900/60 disabled:opacity-50"
                  >
                    {roleBusy ? "Сохраняем…" : "Сохранить роль"}
                  </button>
                </div>
              </div>
              {roleErr && <p className="mt-3 text-sm text-red-300">{roleErr}</p>}
            </div>
          </div>

          {data.user.bestItem && (
            <div className="rounded-2xl border border-cb-stroke bg-[#0a1020]/80 p-6 shadow-inner backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-cb-flame/90">
                Лучший дроп
              </p>
              <div className="mt-3 flex items-start justify-between gap-6">
                <div>
                  <p className="text-lg font-bold text-white">{data.user.bestItem.name}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Редкость: {data.user.bestItem.rarity}
                  </p>
                  {data.user.bestItem.caseSlug ? (
                    <p className="mt-1 font-mono text-[10px] text-zinc-600">{data.user.bestItem.caseSlug}</p>
                  ) : null}
                  {data.user.bestItem.dmarketTitle ? (
                    <p className="mt-1 text-[11px] text-sky-500/85">{data.user.bestItem.dmarketTitle}</p>
                  ) : null}
                  <p className="mt-2 font-mono text-2xl font-black text-cb-flame">
                    {formatSiteAmount(data.user.bestItem.sellPrice)}
                  </p>
                </div>
                <div
                  className={`relative h-20 w-20 overflow-hidden rounded-xl ring-1 ${
                    rarityClass[data.user.bestItem.rarity] || rarityClass.common
                  }`}
                >
                  <Image
                    src={
                      data.user.bestItem.image
                        ? (preferHighResSteamEconomyImage(data.user.bestItem.image) ??
                          data.user.bestItem.image)
                        : "/logo.svg"
                    }
                    alt=""
                    fill
                    className={
                      data.user.bestItem.image
                        ? `object-cover ${SKIN_IMG_QUALITY_CLASS}`
                        : "object-cover"
                    }
                    quality={100}
                    unoptimized
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Инвентарь</h2>
            {data.user.inventory.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.user.inventory.map((it) => (
                  <div
                    key={it.itemId}
                    className={`relative overflow-hidden rounded-xl border px-4 py-3 ${
                      rarityClass[it.rarity] || rarityClass.common
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-black/30 ring-1 ring-cb-stroke/60">
                        <Image
                          src={
                            it.image
                              ? (preferHighResSteamEconomyImage(it.image) ?? it.image)
                              : "/logo.svg"
                          }
                          alt=""
                          fill
                          className={it.image ? `object-cover ${SKIN_IMG_QUALITY_CLASS}` : "object-cover"}
                          quality={100}
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{it.name}</p>
                        <p className="mt-1 text-xs text-zinc-300">
                          Продажа:{" "}
                          <span className="font-mono">{formatSiteAmount(it.sellPrice)}</span>
                          {it.rarity ? (
                            <span className="text-zinc-500"> · {it.rarity}</span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] leading-tight text-zinc-600">
                          {it.itemId}
                          {it.caseSlug ? ` · ${it.caseSlug}` : ""}
                          {it.obtainedAt
                            ? ` · ${String(it.obtainedAt).replace("T", " ").slice(0, 16)}`
                            : ""}
                        </p>
                        {(it.dmarketTitle || it.exterior || it.dmarketAssetId) && (
                          <p className="mt-0.5 text-[10px] text-sky-500/85">
                            {it.dmarketTitle || ""}
                            {it.exterior ? ` (${it.exterior})` : ""}
                            {it.dmarketAssetId ? ` · asset ${it.dmarketAssetId}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Инвентарь пуст</p>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Открытия кейсов</h2>
            {data.logs.caseOpens.length ? (
              <div className="overflow-x-auto rounded-xl border border-cb-stroke bg-cb-panel/30">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-cb-stroke text-xs uppercase tracking-wider text-zinc-500">
                      <th className="px-4 py-3">Дата</th>
                      <th className="px-4 py-3">Кейс</th>
                      <th className="px-4 py-3">Предмет</th>
                      <th className="px-4 py-3">Редкость</th>
                      <th className="px-4 py-3">Оплачено</th>
                      <th className="px-4 py-3">Цена предмета</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.caseOpens.map((l, idx) => (
                      <tr key={`${l.at}-${idx}`} className="border-b border-cb-stroke/60 last:border-0">
                        <td className="px-4 py-2 text-xs text-zinc-500">
                          {new Date(l.at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-2">
                          <div>{l.caseName || l.caseSlug}</div>
                          {l.caseSlug && l.caseName ? (
                            <div className="font-mono text-[10px] text-zinc-600">{l.caseSlug}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-2">{l.itemName}</td>
                        <td className="px-4 py-2 text-xs text-zinc-400">{l.rarity || "—"}</td>
                        <td className="px-4 py-2 font-mono text-xs text-zinc-300">
                          {formatSiteAmount(Number(l.pricePaid) || 0)}
                        </td>
                        <td className="px-4 py-2 font-mono text-cb-flame">
                          {formatSiteAmount(l.sellPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Нет логов открытий</p>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Апгрейды</h2>
            {data.logs.upgradeLogs?.length ? (
              <div className="overflow-x-auto rounded-xl border border-cb-stroke bg-cb-panel/30">
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-cb-stroke text-xs uppercase tracking-wider text-zinc-500">
                      <th className="px-4 py-3">Дата</th>
                      <th className="px-4 py-3">Результат</th>
                      <th className="px-4 py-3">Ставка</th>
                      <th className="px-4 py-3">Цель</th>
                      <th className="px-4 py-3">Шанс %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.upgradeLogs.map((u, idx) => (
                      <tr key={`${u.at}-${idx}`} className="border-b border-cb-stroke/60 last:border-0">
                        <td className="px-4 py-2 text-xs text-zinc-500">
                          {u.at?.replace("T", " ").slice(0, 19) || "—"}
                        </td>
                        <td className="px-4 py-2">
                          {u.win ? (
                            <span className="text-emerald-400">Выигрыш</span>
                          ) : (
                            <span className="text-rose-400/90">Проигрыш</span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-zinc-300">
                          {formatSiteAmount(u.stakeTotal)}
                          {u.balanceBoostRub ? (
                            <span className="text-[10px] text-violet-400/80">
                              {" "}
                              +boost {formatSiteAmount(u.balanceBoostRub)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2">
                          <div className="max-w-[240px]">{u.targetName || "—"}</div>
                          <div className="font-mono text-xs text-cb-flame/90">
                            {formatSiteAmount(u.targetPrice)}
                          </div>
                          {u.targetRarity ? (
                            <div className="text-[10px] text-zinc-600">{u.targetRarity}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-zinc-400">
                          {u.chancePct != null && Number.isFinite(Number(u.chancePct))
                            ? `${Number(u.chancePct).toFixed(2)}%`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Нет записей апгрейдов</p>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Пополнения (NOWPayments)</h2>
              {data.logs.depositOrders?.length ? (
                <div className="mt-3 overflow-x-auto rounded-xl border border-cb-stroke bg-cb-panel/30">
                  <table className="w-full min-w-[840px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-cb-stroke text-xs uppercase tracking-wider text-zinc-500">
                        <th className="px-4 py-3">Дата</th>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Статус</th>
                        <th className="px-4 py-3">Кредит (SC)</th>
                        <th className="px-4 py-3">USD</th>
                        <th className="px-4 py-3">Payment ID</th>
                        <th className="px-4 py-3">Промо</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.logs.depositOrders.map((o) => (
                        <tr key={o.orderId} className="border-b border-cb-stroke/60 last:border-0">
                          <td className="px-4 py-2 text-xs text-zinc-500">
                            {o.createdAt?.replace("T", " ").slice(0, 19) || "—"}
                          </td>
                          <td className="px-4 py-2 font-mono text-[11px] text-zinc-300">{o.orderId}</td>
                          <td className="px-4 py-2">
                            {o.credited ? (
                              <span className="text-emerald-400">Зачислено</span>
                            ) : (
                              <span className="text-amber-400">Ожидание</span>
                            )}
                            {o.creditedAt ? (
                              <span className="ml-1 text-[10px] text-zinc-600">
                                {o.creditedAt.slice(0, 19)}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-2 font-mono text-emerald-300/90">
                            {formatSiteAmount(o.creditRubBase)}
                            {o.depositPercent > 0 ? (
                              <span className="text-[10px] text-zinc-500"> +{o.depositPercent}%</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-zinc-400">{o.amountUsd}</td>
                          <td className="px-4 py-2 font-mono text-[10px] text-zinc-500">
                            {o.paymentId || "—"}
                          </td>
                          <td className="px-4 py-2 font-mono text-[10px] text-zinc-500">
                            {o.promoId || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">Нет записей пополнений</p>
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Заявки на вывод (Market.csgo)</h2>
              {data.logs.withdrawals?.length ? (
                <div className="mt-3 overflow-x-auto rounded-xl border border-cb-stroke bg-cb-panel/30">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-cb-stroke text-xs uppercase tracking-wider text-zinc-500">
                        <th className="px-4 py-3">Создано</th>
                        <th className="px-4 py-3">Обновлено</th>
                        <th className="px-4 py-3">Статус</th>
                        <th className="px-4 py-3">Предмет</th>
                        <th className="px-4 py-3">Лот</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.logs.withdrawals.map((w) => (
                        <tr key={w.id} className="border-b border-cb-stroke/60 last:border-0">
                          <td className="px-4 py-2 text-xs text-zinc-500">
                            {w.createdAt?.replace("T", " ").slice(0, 19) || "—"}
                          </td>
                          <td className="px-4 py-2 text-xs text-zinc-600">
                            {w.updatedAt?.replace("T", " ").slice(0, 19) || "—"}
                          </td>
                          <td className="px-4 py-2">
                            <span className="font-semibold text-zinc-200">{w.status}</span>
                            {w.resolvedAt ? (
                              <div className="text-[10px] text-zinc-600">resolved: {w.resolvedAt.slice(0, 19)}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-2">
                            <div className="max-w-[220px]">{w.itemName || "—"}</div>
                            <div className="font-mono text-xs text-cb-flame/90">
                              {formatSiteAmount(w.itemSellPrice)}
                            </div>
                            {w.lastError ? (
                              <div className="mt-1 max-w-[280px] text-[10px] text-red-400/90">{w.lastError}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-2 font-mono text-[10px] text-zinc-500">
                            {w.transferId || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">Нет заявок на вывод</p>
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Промокоды</h2>
              {data.logs.promoLogs.length ? (
                <div className="mt-3 overflow-x-auto rounded-xl border border-cb-stroke bg-cb-panel/30">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-cb-stroke text-xs uppercase tracking-wider text-zinc-500">
                        <th className="px-4 py-3">Дата</th>
                        <th className="px-4 py-3">Промо</th>
                        <th className="px-4 py-3">userSub</th>
                        <th className="px-4 py-3">Начисление</th>
                        <th className="px-4 py-3">Тип / % депозита</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.logs.promoLogs.map((p, idx) => (
                        <tr key={`${p.at}-${idx}`} className="border-b border-cb-stroke/60 last:border-0">
                          <td className="px-4 py-2 text-xs text-zinc-500">
                            {p.at?.replace("T", " ").slice(0, 19) || "—"}
                          </td>
                          <td className="px-4 py-2 font-mono text-[11px] text-zinc-300">
                            {p.promoId || "—"}
                          </td>
                          <td className="px-4 py-2 font-mono text-[10px] text-zinc-600">{p.userSub}</td>
                          <td className="px-4 py-2 font-mono text-emerald-300/90">+{formatSiteAmount(p.grant)}</td>
                          <td className="px-4 py-2 text-xs text-zinc-400">
                            {p.rewardType || "—"}
                            {p.depositPercent != null && p.depositPercent > 0 ? (
                              <span className="text-zinc-500"> · депозит +{p.depositPercent}%</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Нет логов промокодов</p>
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Продажи</h2>
              {data.logs.sellLogs.length ? (
                <div className="overflow-x-auto rounded-xl border border-cb-stroke bg-cb-panel/30">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-cb-stroke text-xs uppercase tracking-wider text-zinc-500">
                      <th className="px-4 py-3">Дата</th>
                      <th className="px-4 py-3">Предмет</th>
                      <th className="px-4 py-3">Кейс / itemId</th>
                      <th className="px-4 py-3">Редкость</th>
                      <th className="px-4 py-3">Продажа</th>
                    </tr>
                  </thead>
                  <tbody>
                      {data.logs.sellLogs.map((l, idx) => (
                        <tr key={`${l.at}-${idx}`} className="border-b border-cb-stroke/60 last:border-0">
                          <td className="px-4 py-2 text-xs text-zinc-500">
                            {new Date(l.at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-4 py-2">{l.name}</td>
                          <td className="px-4 py-2 font-mono text-[10px] text-zinc-500">
                            <div>{l.caseSlug || "—"}</div>
                            <div className="text-zinc-600">{l.itemId}</div>
                          </td>
                          <td className="px-4 py-2 text-xs text-zinc-400">{l.rarity || "—"}</td>
                          <td className="px-4 py-2 font-mono text-cb-flame">
                            {formatSiteAmount(l.sellPrice)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Нет логов продаж</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

