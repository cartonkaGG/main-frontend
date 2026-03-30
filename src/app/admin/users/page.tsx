"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatRub } from "@/lib/money";

type InventoryItem = {
  itemId: string;
  caseSlug: string;
  name: string;
  image: string;
  rarity: string;
  sellPrice: number;
  obtainedAt: string;
};

type CaseOpenLog = {
  at: string;
  steamId: string;
  caseSlug: string;
  caseName: string;
  pricePaid: number;
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

type AdminUserResponse = {
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
    inventory: InventoryItem[];
    bestItem: InventoryItem | null;
  };
  logs: {
    caseOpens: CaseOpenLog[];
    promoLogs: PromoLog[];
    sellLogs: SellLog[];
  };
  derived: {
    net: number;
  };
};

const rarityClass: Record<string, string> = {
  common: "border-zinc-600/80 bg-zinc-950/50 text-zinc-300",
  uncommon: "border-emerald-600/50 bg-emerald-950/20 text-emerald-300",
  rare: "border-blue-600/50 bg-blue-950/25 text-blue-300",
  epic: "border-purple-600/50 bg-purple-950/25 text-purple-300",
  legendary: "border-orange-500/50 bg-red-950/30 text-orange-300",
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

  const isValid = useMemo(() => {
    const s = steamId.trim();
    return /^\d+$/.test(s);
  }, [steamId]);

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
                <div>
                  <p className="text-xl font-bold text-white">{data.user.displayName}</p>
                  <p className="mt-1 font-mono text-xs text-zinc-500">{data.user.steamId}</p>
                  <p className="mt-1 text-xs text-amber-400/90">Роль: {data.user.role}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-orange-300/80">
                    Баланс
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black text-white">
                    {formatRub(data.user.balance)} ₽
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                    Нетто
                  </p>
                  <p className="mt-1 font-mono text-lg font-black text-cb-flame">
                    {formatRub(data.derived.net)} ₽
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                    Логи
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">
                    Открытий: {data.user.battlesPlayed} · Побед: {data.user.battleWins} ·
                    Поражений: {data.user.battlesLosses}
                  </p>
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
                    <span className="text-xs font-bold text-zinc-500">Значение (₽)</span>
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
                  <p className="mt-2 font-mono text-2xl font-black text-cb-flame">
                    {formatRub(data.user.bestItem.sellPrice)} ₽
                  </p>
                </div>
                <div
                  className={`relative h-20 w-20 overflow-hidden rounded-xl ring-1 ${
                    rarityClass[data.user.bestItem.rarity] || rarityClass.common
                  }`}
                >
                  <Image
                    src={data.user.bestItem.image || "/logo.svg"}
                    alt=""
                    fill
                    className="object-cover"
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
                          src={it.image || "/logo.svg"}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{it.name}</p>
                        <p className="mt-1 text-xs text-zinc-300">
                          Продажа:{" "}
                          <span className="font-mono">{formatRub(it.sellPrice)} ₽</span>
                        </p>
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
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-cb-stroke text-xs uppercase tracking-wider text-zinc-500">
                      <th className="px-4 py-3">Дата</th>
                      <th className="px-4 py-3">Кейс</th>
                      <th className="px-4 py-3">Предмет</th>
                      <th className="px-4 py-3">Цена</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.caseOpens.map((l, idx) => (
                      <tr key={`${l.at}-${idx}`} className="border-b border-cb-stroke/60 last:border-0">
                        <td className="px-4 py-2 text-xs text-zinc-500">
                          {new Date(l.at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-2">{l.caseName || l.caseSlug}</td>
                        <td className="px-4 py-2">{l.itemName}</td>
                        <td className="px-4 py-2 font-mono text-cb-flame">
                          {formatRub(l.sellPrice)} ₽
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

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Промокоды</h2>
              {data.logs.promoLogs.length ? (
                <pre className="mt-3 max-h-96 overflow-auto rounded-xl border border-cb-stroke bg-black/20 p-3 text-xs text-zinc-300">
{JSON.stringify(data.logs.promoLogs, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-zinc-500">Нет логов промокодов</p>
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Продажи</h2>
              {data.logs.sellLogs.length ? (
                <div className="overflow-x-auto rounded-xl border border-cb-stroke bg-cb-panel/30">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-cb-stroke text-xs uppercase tracking-wider text-zinc-500">
                        <th className="px-4 py-3">Дата</th>
                        <th className="px-4 py-3">Предмет</th>
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
                          <td className="px-4 py-2 font-mono text-cb-flame">
                            {formatRub(l.sellPrice)} ₽
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

