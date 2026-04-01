"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatRub } from "@/lib/money";
import { MarketCsgoHashInput } from "@/components/admin/MarketCsgoHashInput";

type ItemSnap = {
  itemId?: string;
  name?: string;
  image?: string;
  rarity?: string;
  sellPrice?: number;
  dmarketTitle?: string;
  marketHashName?: string;
};

type Withdrawal = {
  id: string;
  status: string;
  userSub: string;
  steamId: string;
  displayName: string;
  tradeUrl: string;
  itemSnapshot: ItemSnap;
  createdAt: string;
  updatedAt: string;
  transferId?: string;
  lastError?: string;
  adminNote?: string;
  resolvedBySub?: string;
  resolvedBySteamId?: string;
  resolvedByDisplayName?: string;
  /** ISO — скасування з профілю гравцем */
  playerCancelledAt?: string;
};

type RowInputs = { marketHashName: string; maxPriceRub: string };

type InspectInventoryItem = {
  itemId: string;
  caseSlug?: string;
  name: string;
  image?: string;
  rarity: string;
  sellPrice: number;
  obtainedAt?: string;
};

type InspectCaseOpen = {
  at: string;
  caseSlug: string;
  caseName: string;
  pricePaid: number;
  itemName: string;
  sellPrice: number;
};

type InspectSellLog = {
  at: string;
  name: string;
  sellPrice: number;
};

type InspectPromoLog = {
  at: string;
  grant: number;
  promoId?: string;
};

type InspectDepositOrder = {
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

type InspectWithdrawalRow = {
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

type AdminUserInspectResponse = {
  user: {
    steamId: string;
    displayName: string;
    avatar: string;
    role: string;
    balance: number;
    totalWon: number;
    totalSpent: number;
    battlesPlayed: number;
    battleWins: number;
    battlesLosses: number;
    inventory: InspectInventoryItem[];
    bestItem: InspectInventoryItem | null;
  };
  logs: {
    caseOpens: InspectCaseOpen[];
    promoLogs: InspectPromoLog[];
    sellLogs: InspectSellLog[];
    depositOrders: InspectDepositOrder[];
    withdrawals: InspectWithdrawalRow[];
  };
  derived: { net: number };
};

function steamIdForWithdrawal(w: Withdrawal): string {
  const sid = String(w.steamId || "").trim();
  if (/^\d{8,}$/.test(sid)) return sid;
  const sub = String(w.userSub || "").trim();
  if (/^\d{8,}$/.test(sub)) return sub;
  return "";
}

const statusClass: Record<string, string> = {
  pending: "text-amber-300",
  processing: "text-sky-300",
  completed: "text-emerald-300",
  cancelled: "text-zinc-500",
  failed: "text-red-300",
};

function withdrawalAuditLines(w: Withdrawal): { key: string; text: string; className: string }[] {
  const lines: { key: string; text: string; className: string }[] = [];
  const st = String(w.status || "").toLowerCase();
  const adminLabel = [w.resolvedByDisplayName?.trim(), w.resolvedBySteamId || w.resolvedBySub]
    .filter(Boolean)
    .join(" · ");

  if (st === "completed" && adminLabel) {
    lines.push({
      key: "approved",
      text: `Подтвердил: ${adminLabel}`,
      className: "text-emerald-200/90",
    });
  }

  if (st === "cancelled") {
    if (w.playerCancelledAt) {
      lines.push({ key: "c-user", text: "Отменил: игрок", className: "text-zinc-400" });
    } else if (adminLabel) {
      lines.push({
        key: "c-admin",
        text: `Отменил админ: ${adminLabel}`,
        className: "text-zinc-400",
      });
    } else if (/игроком|игрок/i.test(w.adminNote || "")) {
      lines.push({
        key: "c-legacy",
        text: "Отменил: игрок (старая заявка)",
        className: "text-zinc-500",
      });
    }
  }

  if (st === "failed" && adminLabel) {
    lines.push({
      key: "fail-act",
      text: `Действие админа: ${adminLabel}`,
      className: "text-zinc-500",
    });
  }

  return lines;
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [marketCsgoConfigured, setMarketCsgoConfigured] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowInputs, setRowInputs] = useState<Record<string, RowInputs>>({});
  const [inspect, setInspect] = useState<{
    steamId: string;
    title: string;
    userSub: string;
  } | null>(null);
  const [inspectData, setInspectData] = useState<AdminUserInspectResponse | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectErr, setInspectErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const r = await apiFetch<{ withdrawals: Withdrawal[]; marketCsgoConfigured?: boolean }>(
      "/api/admin/withdrawals",
    );
    setLoading(false);
    if (!r.ok) {
      setErr(r.error || "Не удалось загрузить");
      setWithdrawals([]);
      return;
    }
    const list = Array.isArray(r.data?.withdrawals) ? r.data!.withdrawals : [];
    setWithdrawals(list);
    setMarketCsgoConfigured(Boolean(r.data?.marketCsgoConfigured));
    setRowInputs((prev) => {
      const next = { ...prev };
      for (const w of list) {
        const s = w.itemSnapshot || {};
        const hashFromSnap = String(s.dmarketTitle || s.marketHashName || "").trim();
        const nameStr = String(s.name || "").trim();
        const prevRow = next[w.id];
        if (!prevRow) {
          next[w.id] = { marketHashName: hashFromSnap, maxPriceRub: "" };
          continue;
        }
        if (w.status === "pending" || w.status === "failed") {
          const cur = prevRow.marketHashName.trim();
          if (!cur || cur === nameStr) {
            next[w.id] = {
              ...prevRow,
              marketHashName: hashFromSnap || s.marketHashName || cur,
            };
          }
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = useMemo(() => withdrawals.filter((w) => w.status === "pending").length, [withdrawals]);
  const failedRetryCount = useMemo(() => withdrawals.filter((w) => w.status === "failed").length, [withdrawals]);

  async function approve(w: Withdrawal) {
    const inputs = rowInputs[w.id] || { marketHashName: "", maxPriceRub: "" };
    setBusyId(w.id);
    setErr(null);
    const maxRaw = inputs.maxPriceRub.trim();
    const body: Record<string, unknown> = {
      action: "approve",
      marketHashName: inputs.marketHashName.trim(),
    };
    if (maxRaw !== "") {
      const n = Number(maxRaw.replace(",", "."));
      if (Number.isFinite(n) && n > 0) body.maxPriceRub = n;
    }
    const r = await apiFetch<{ withdrawal?: Withdrawal; error?: string }>(`/api/admin/withdrawals/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusyId(null);
    if (!r.ok) {
      setErr(r.error || "Ошибка");
      await load();
      return;
    }
    await load();
  }

  const openUserInspect = useCallback(async (w: Withdrawal) => {
    const steamId = steamIdForWithdrawal(w);
    if (!steamId) {
      setErr("У заявки нет Steam ID (steamId / userSub) — карточку не загрузить.");
      return;
    }
    setInspect({
      steamId,
      title: w.displayName || steamId,
      userSub: String(w.userSub || ""),
    });
    setInspectData(null);
    setInspectErr(null);
    setInspectLoading(true);
    const r = await apiFetch<AdminUserInspectResponse>(
      `/api/admin/users/${encodeURIComponent(steamId)}`,
    );
    setInspectLoading(false);
    if (!r.ok) {
      setInspectErr(r.error || "Не удалось загрузить");
      return;
    }
    setInspectData(r.data ?? null);
  }, []);

  const closeInspect = useCallback(() => {
    setInspect(null);
    setInspectData(null);
    setInspectErr(null);
    setInspectLoading(false);
  }, []);

  useEffect(() => {
    if (!inspect) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeInspect();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspect, closeInspect]);

  async function cancel(w: Withdrawal) {
    const msg =
      w.status === "failed"
        ? "Отменить заявку и вернуть предмет игроку в инвентарь?"
        : "Отменить заявку?";
    if (!window.confirm(msg)) return;
    setBusyId(w.id);
    setErr(null);
    const r = await apiFetch(`/api/admin/withdrawals/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    setBusyId(null);
    if (!r.ok) {
      setErr(r.error || "Ошибка");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Вывод скинов (Market.csgo)</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Подтверждение вызывает <span className="font-mono text-zinc-400">GET /api/v2/buy-for</span> с вашего
            аккаунта market.csgo: покупка самого дешёвого лота по <span className="font-mono">market_hash_name</span> и
            отправка на trade URL игрока. Параметр <span className="font-mono">price</span> — максимум в копейках; если
            биржа пишет «не найдено по цене» — увеличьте <span className="font-semibold text-zinc-300">Макс. цена ₽</span>{" "}
            (цена на сайте часто ниже реального ордербука). Нужен баланс на маркете и{" "}
            <span className="font-mono">MARKET_CSGO_API_KEY</span> в .env. Лимит API: не более 5 запросов/с. Если биржа
            пишет о закрытом инвентаре — у игрока в Steam должен быть{" "}
            <span className="font-semibold text-zinc-300">открытый</span> инвентарь CS (Public). Если{" "}
            <span className="font-semibold text-zinc-300">buy-for</span> вернул ошибку, предмет{" "}
            <span className="font-semibold text-zinc-300">остаётся снятым</span> с инвентаря: используйте{" "}
            <span className="font-semibold text-emerald-300/90">Повторить отправку</span> или{" "}
            <span className="font-semibold text-zinc-300">Отменить</span> (тогда предмет вернётся игроку).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-xl border border-cb-stroke bg-black/40 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-amber-500/50 hover:text-white disabled:opacity-50"
        >
          {loading ? "…" : "Обновить"}
        </button>
      </div>

      {!marketCsgoConfigured ? (
        <p className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-sm text-amber-200">
          Market.csgo не настроен: добавьте <span className="font-mono">MARKET_CSGO_API_KEY</span> в backend .env
          (ключ из раздела Creating an API key) и перезапустите сервер.
        </p>
      ) : null}

      {pendingCount > 0 || failedRetryCount > 0 ? (
        <p className="text-xs text-zinc-500">
          {pendingCount > 0 ? (
            <>
              В ожидании: <span className="font-mono text-amber-200">{pendingCount}</span>
            </>
          ) : null}
          {pendingCount > 0 && failedRetryCount > 0 ? " · " : null}
          {failedRetryCount > 0 ? (
            <>
              Ошибка отправки (повтор):{" "}
              <span className="font-mono text-red-300/90">{failedRetryCount}</span>
            </>
          ) : null}
        </p>
      ) : null}

      {err ? (
        <p className="rounded-xl border border-red-500/35 bg-red-950/20 px-4 py-3 text-sm text-red-300">{err}</p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-cb-stroke bg-cb-panel/40">
        <table className="w-full min-w-[1100px] text-left text-[12px]">
          <thead className="border-b border-cb-stroke bg-black/50 text-[10px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-3 py-2.5">Час</th>
              <th className="px-3 py-2.5">Статус</th>
              <th className="px-3 py-2.5">Игрок</th>
              <th className="px-3 py-2.5">Предмет</th>
              <th className="px-3 py-2.5">Trade URL</th>
              <th className="px-3 py-2.5">Market hash / макс. ₽</th>
              <th className="px-3 py-2.5">Действия</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-zinc-600">
                  Заявок пока нет.
                </td>
              </tr>
            ) : null}
            {withdrawals.map((w) => {
              const snap = w.itemSnapshot || {};
              const inputs = rowInputs[w.id] || { marketHashName: "", maxPriceRub: "" };
              const busy = busyId === w.id;
              return (
                <tr key={w.id} className="border-b border-cb-stroke/40 align-top">
                  <td className="px-3 py-2.5 font-mono text-[10px] text-zinc-500">
                    {w.createdAt?.replace("T", " ").slice(0, 19) || "—"}
                  </td>
                  <td className={`px-3 py-2.5 font-semibold ${statusClass[w.status] || "text-zinc-400"}`}>
                    {w.status}
                    {w.transferId ? (
                      <div className="mt-1 font-mono text-[10px] font-normal text-zinc-500">
                        id лота: {w.transferId}
                      </div>
                    ) : null}
                    {w.lastError ? (
                      <div className="mt-1 max-w-[200px] text-[10px] font-normal text-red-400/90">{w.lastError}</div>
                    ) : null}
                    {withdrawalAuditLines(w).map((line) => (
                      <div key={line.key} className={`mt-1 max-w-[240px] text-[10px] font-normal ${line.className}`}>
                        {line.text}
                      </div>
                    ))}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">
                    <div className="max-w-[160px] truncate font-medium">{w.displayName || "—"}</div>
                    <div className="font-mono text-[10px] text-zinc-600">{w.steamId || w.userSub}</div>
                    <button
                      type="button"
                      onClick={() => void openUserInspect(w)}
                      className="mt-1.5 rounded-md border border-sky-600/40 bg-sky-950/25 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-300/95 transition hover:border-sky-500/60 hover:bg-sky-950/40"
                    >
                      Данные игрока
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">
                    <div className="max-w-[180px] font-medium leading-tight">{snap.name || "—"}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-cb-flame/90">
                      {formatRub(Number(snap.sellPrice) || 0)} ₽
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <a
                      href={w.tradeUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="max-w-[200px] break-all text-sky-400 hover:text-sky-300"
                    >
                      {w.tradeUrl ? "Ссылка" : "—"}
                    </a>
                  </td>
                  <td className="px-3 py-2.5">
                    {w.status === "pending" || w.status === "failed" ? (
                      <div className="flex flex-col gap-1">
                        <MarketCsgoHashInput
                          showHint={false}
                          value={inputs.marketHashName}
                          onChange={(v) =>
                            setRowInputs((prev) => {
                              const cur = prev[w.id] || { marketHashName: "", maxPriceRub: "" };
                              return { ...prev, [w.id]: { ...cur, marketHashName: v } };
                            })
                          }
                          inputClassName="w-full max-w-[280px] rounded border border-cb-stroke/70 bg-black/50 px-2 py-1 font-mono text-[10px] text-zinc-200"
                        />
                        <input
                          placeholder="Макс. цена ₽ (реком.+15–40%)"
                          value={inputs.maxPriceRub}
                          onChange={(e) =>
                            setRowInputs((prev) => ({
                              ...prev,
                              [w.id]: { ...inputs, maxPriceRub: e.target.value },
                            }))
                          }
                          className="w-full max-w-[140px] rounded border border-cb-stroke/70 bg-black/50 px-2 py-1 font-mono text-[10px] text-zinc-200"
                        />
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] text-zinc-500">
                        {snap.marketHashName || inputs.marketHashName || snap.name || "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {w.status === "pending" || w.status === "failed" ? (
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          disabled={busy || !marketCsgoConfigured}
                          onClick={() => void approve(w)}
                          className="rounded-lg border border-emerald-600/50 bg-emerald-950/30 px-2 py-1.5 text-[11px] font-bold text-emerald-200 transition hover:bg-emerald-900/40 disabled:opacity-40"
                        >
                          {busy ? "…" : w.status === "failed" ? "Повторить отправку" : "Подтвердить"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void cancel(w)}
                          className="rounded-lg border border-zinc-600 bg-black/40 px-2 py-1.5 text-[11px] font-semibold text-zinc-400 transition hover:border-red-500/40 hover:text-red-300 disabled:opacity-40"
                        >
                          Отменить
                        </button>
                      </div>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {inspect ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeInspect}
          />
          <div className="relative z-10 flex max-h-[min(88vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-cb-stroke/80 bg-[#0a0e14] shadow-2xl shadow-black/70">
            <div className="flex items-start justify-between gap-3 border-b border-cb-stroke/60 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-white">Карточка игрока</h2>
                <p className="mt-0.5 text-sm text-zinc-400">{inspect.title}</p>
                <p className="mt-1 font-mono text-[11px] text-zinc-500">Steam ID: {inspect.steamId}</p>
                {inspect.userSub && inspect.userSub !== inspect.steamId ? (
                  <p className="mt-0.5 font-mono text-[10px] text-zinc-600">userSub: {inspect.userSub}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Link
                  href={`/admin/users?q=${encodeURIComponent(inspect.steamId)}`}
                  className="text-[11px] font-semibold text-sky-400 hover:text-sky-300"
                  onClick={closeInspect}
                >
                  Полная карточка в админке →
                </Link>
                <button
                  type="button"
                  onClick={closeInspect}
                  className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/5"
                >
                  Закрыть
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {inspectLoading ? (
                <p className="text-sm text-zinc-500">Загрузка…</p>
              ) : inspectErr ? (
                <p className="text-sm text-red-400">{inspectErr}</p>
              ) : inspectData?.user ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-4">
                    {inspectData.user.avatar ? (
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-cb-stroke/60 bg-black/40">
                        <Image
                          src={inspectData.user.avatar}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : null}
                    <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Баланс</p>
                        <p className="font-mono font-semibold text-emerald-300">
                          {formatRub(inspectData.user.balance)} ₽
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Роль</p>
                        <p className="font-medium text-zinc-200">{inspectData.user.role || "user"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Потрачено / выиграно</p>
                        <p className="font-mono text-xs text-zinc-300">
                          {formatRub(inspectData.user.totalSpent)} / {formatRub(inspectData.user.totalWon)} ₽
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Бои (в/всего)</p>
                        <p className="font-mono text-xs text-zinc-300">
                          {inspectData.user.battleWins} / {inspectData.user.battlesPlayed}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Net (derived)</p>
                        <p className="font-mono text-xs text-zinc-300">
                          {formatRub(inspectData.derived?.net ?? 0)} ₽
                        </p>
                      </div>
                    </div>
                  </div>

                  <section>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Инвентарь ({inspectData.user.inventory?.length ?? 0})
                    </h3>
                    {inspectData.user.inventory?.length ? (
                      <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-cb-stroke/50 bg-black/30 p-2 text-[11px]">
                        {inspectData.user.inventory.map((it) => (
                          <li
                            key={it.itemId}
                            className="flex justify-between gap-2 border-b border-cb-stroke/20 py-1 last:border-0"
                          >
                            <span className="min-w-0 truncate text-zinc-200">{it.name}</span>
                            <span className="shrink-0 font-mono text-cb-flame/90">
                              {formatRub(it.sellPrice)} ₽
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-zinc-600">Пусто</p>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Пополнения (NOWPayments, до 25)
                    </h3>
                    {(inspectData.logs.depositOrders ?? []).length ? (
                      <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-cb-stroke/50 bg-black/30 p-2 text-[10px]">
                        {(inspectData.logs.depositOrders ?? []).slice(0, 25).map((o) => (
                          <li key={o.orderId} className="border-b border-cb-stroke/15 py-1 text-zinc-400 last:border-0">
                            <span className="font-mono text-zinc-600">
                              {o.createdAt?.replace("T", " ").slice(0, 19)}
                            </span>{" "}
                            <span className={o.credited ? "text-emerald-400/95" : "text-amber-400/90"}>
                              {o.credited ? "✓" : "…"}
                            </span>{" "}
                            <span className="font-mono text-zinc-300">{formatRub(o.creditRubBase)} ₽</span>
                            <span className="text-zinc-600"> · {o.amountUsd} USD</span>
                            {o.paymentId ? (
                              <span className="ml-1 font-mono text-[9px] text-zinc-600">{o.paymentId}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-zinc-600">Нет записей</p>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Выводы Market.csgo (до 25)
                    </h3>
                    {(inspectData.logs.withdrawals ?? []).length ? (
                      <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-cb-stroke/50 bg-black/30 p-2 text-[10px]">
                        {(inspectData.logs.withdrawals ?? []).slice(0, 25).map((wd) => (
                          <li key={wd.id} className="border-b border-cb-stroke/15 py-1 text-zinc-400 last:border-0">
                            <span className="font-mono text-zinc-600">
                              {wd.createdAt?.replace("T", " ").slice(0, 19)}
                            </span>{" "}
                            <span className="font-semibold text-zinc-200">{wd.status}</span> —{" "}
                            <span className="text-zinc-300">{wd.itemName || "—"}</span>{" "}
                            <span className="text-cb-flame/85">{formatRub(wd.itemSellPrice)} ₽</span>
                            {wd.transferId ? (
                              <span className="ml-1 font-mono text-[9px] text-zinc-600">лот {wd.transferId}</span>
                            ) : null}
                            {wd.lastError ? (
                              <div className="mt-0.5 text-[9px] text-red-400/90">{wd.lastError.slice(0, 120)}</div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-zinc-600">Нет заявок</p>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Открытия кейсов (последние 15)
                    </h3>
                    {inspectData.logs.caseOpens?.length ? (
                      <ul className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-cb-stroke/50 bg-black/30 p-2 text-[10px]">
                        {inspectData.logs.caseOpens.slice(0, 15).map((log, i) => (
                          <li key={`${log.at}-${i}`} className="text-zinc-400">
                            <span className="font-mono text-zinc-600">
                              {log.at?.replace("T", " ").slice(0, 19)}
                            </span>{" "}
                            <span className="text-zinc-300">{log.caseName || log.caseSlug}</span> →{" "}
                            <span className="text-zinc-200">{log.itemName}</span>{" "}
                            <span className="text-cb-flame/80">({formatRub(log.sellPrice)} ₽)</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-zinc-600">Нет записей</p>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Продажи (последние 10)
                    </h3>
                    {inspectData.logs.sellLogs?.length ? (
                      <ul className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-cb-stroke/50 bg-black/30 p-2 text-[10px]">
                        {inspectData.logs.sellLogs.slice(0, 10).map((log, i) => (
                          <li key={`${log.at}-${i}`} className="text-zinc-400">
                            <span className="font-mono text-zinc-600">
                              {log.at?.replace("T", " ").slice(0, 19)}
                            </span>{" "}
                            {log.name}{" "}
                            <span className="text-cb-flame/80">{formatRub(log.sellPrice)} ₽</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-zinc-600">Нет записей</p>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Промокоды (последние 8)
                    </h3>
                    {inspectData.logs.promoLogs?.length ? (
                      <ul className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-cb-stroke/50 bg-black/30 p-2 text-[10px]">
                        {inspectData.logs.promoLogs.slice(0, 8).map((log, i) => (
                          <li key={`${log.at}-${i}`} className="text-zinc-400">
                            <span className="font-mono text-zinc-600">
                              {log.at?.replace("T", " ").slice(0, 19)}
                            </span>{" "}
                            {log.promoId ? <span className="text-zinc-500">{log.promoId} </span> : null}
                            <span className="text-emerald-400/90">+{formatRub(log.grant)} ₽</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-zinc-600">Нет записей</p>
                    )}
                  </section>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Нет данных</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
