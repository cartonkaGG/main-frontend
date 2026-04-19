"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PartnerFaqAccordion } from "@/components/PartnerFaqAccordion";
import { PartnerMaterialBanner } from "@/components/PartnerMaterialBanner";
import { PartnerMaterialBannerShare } from "@/components/PartnerMaterialBannerShare";
import { SiteMoney } from "@/components/SiteMoney";
import { usePartnerCabinetTab } from "@/contexts/PartnerCabinetTabContext";

type Dash = {
  partner: {
    id: string;
    percentBps: number;
    percentDisplay: string;
    /** Рівень партнерки / рефералки (поки всім 0). */
    level: number;
    totalEarnedConfirmedRub: number;
    totalEarnedPendingRub: number;
    totalPaidOutRub: number;
    usersActivated: number;
    depositsCount: number;
    depositsVolumeRub: number;
  };
  user?: {
    steamId: string | null;
    displayName: string | null;
    username: string | null;
    avatar: string;
  } | null;
  codes: { id: string; code: string; label: string; active: boolean; depositBonusPercent?: number }[];
  earnings: {
    id: string;
    at: string;
    orderId: string;
    netDepositRub: number;
    percentBps: number;
    rewardRub: number;
    status: string;
  }[];
};

type PeriodStats = {
  from: string | null;
  to: string | null;
  series: { day: string; rewardRub: number; netDepositRub: number; count: number }[];
  totals: { rewardRub: number; netDepositRub: number; count: number };
  earnings: Dash["earnings"];
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - n);
  return { from: ymd(from), to: ymd(to) };
}

function periodLabel(from: string, to: string): string {
  if (!from && !to) return "За всё время";
  if (from && to) {
    const a = new Date(from);
    const b = new Date(to);
    const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
    if (diff <= 8) return "Последние 7 дней";
    if (diff <= 32) return "Последние 30 дней";
    if (diff <= 95) return "Последние 90 дней";
  }
  return `${from || "…"} — ${to || "…"}`;
}

export default function PartnerDashboardPage() {
  const { tab } = usePartnerCabinetTab();
  const [data, setData] = useState<Dash | null>(null);
  const [period, setPeriod] = useState(() => daysAgo(30));
  const [preset, setPreset] = useState<"7" | "30" | "90" | "all">("30");
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [statsErr, setStatsErr] = useState<string | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    void (async () => {
      const r = await apiFetch<Dash>("/api/partner/me");
      if (c) return;
      if (!r.ok) setErr(r.error || "Ошибка загрузки");
      else setData(r.data || null);
    })();
    return () => {
      c = true;
    };
  }, []);

  const loadStats = useCallback(async (from: string, to: string) => {
    setStatsErr(null);
    setLoadingStats(true);
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const q = qs.toString();
    const r = await apiFetch<PeriodStats>(`/api/partner/stats${q ? `?${q}` : ""}`);
    setLoadingStats(false);
    if (!r.ok) {
      setStatsErr(r.error || "Не удалось загрузить статистику");
      setStats(null);
      return;
    }
    setStats(r.data || null);
  }, []);

  useEffect(() => {
    void loadStats(period.from, period.to);
  }, [period.from, period.to, loadStats]);

  const maxBar = useMemo(() => {
    const s = stats?.series || [];
    return Math.max(1, ...s.map((x) => x.rewardRub));
  }, [stats?.series]);

  const peakIdx = useMemo(() => {
    const s = stats?.series || [];
    if (!s.length) return -1;
    let m = 0;
    s.forEach((row, i) => {
      if (row.rewardRub > s[m].rewardRub) m = i;
    });
    return m;
  }, [stats?.series]);

  /** Промокод для баннера «Материал»: перший активный или любой первый из списка. */
  const materialPartnerPromoCode = useMemo(() => {
    const list = data?.codes ?? [];
    const picked = list.find((c) => c.active) ?? list[0];
    const raw = picked?.code?.trim();
    return raw && raw.length > 0 ? raw : null;
  }, [data?.codes]);

  const onPreset = (v: "7" | "30" | "90" | "all") => {
    setPreset(v);
    if (v === "all") setPeriod({ from: "", to: "" });
    else {
      const n = v === "7" ? 7 : v === "30" ? 30 : 90;
      setPeriod(daysAgo(n));
    }
  };

  if (err) {
    return <p className="text-red-400">{err}</p>;
  }
  if (!data?.partner) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cb-flame/30 border-t-cb-flame" />
      </div>
    );
  }

  const p = data.partner;
  const shortId = p.id ? `#${String(p.id).slice(-6)}` : "—";

  return (
    <div className="pb-8">
      {tab === "analytics" ? (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
              Аналитика партнёра
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Показатели в реальном времени · ID:{" "}
              <span className="font-mono text-zinc-400">{shortId}</span>
              {" · "}
              уровень{" "}
              <span className="font-mono text-zinc-300">{p.level ?? 0}</span>
              {" · "}
              ставка{" "}
              <span className="font-mono text-cb-flame/95">{p.percentDisplay}%</span> от чистой базы депозита
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#111] px-3 py-1.5 text-xs font-medium text-zinc-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cb-flame shadow-[0_0_8px_rgba(255,49,49,0.8)]" />
              Статус: активен
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-zinc-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 3v4M16 3v4M3 11h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <select
                value={preset}
                onChange={(e) => onPreset(e.target.value as typeof preset)}
                className="appearance-none rounded-xl border border-white/[0.1] bg-[#111] py-2.5 pl-10 pr-8 text-sm text-zinc-200 focus:border-cb-flame/40 focus:outline-none focus:ring-1 focus:ring-cb-flame/30"
              >
                <option value="7">Последние 7 дней</option>
                <option value="30">Последние 30 дней</option>
                <option value="90">Последние 90 дней</option>
                <option value="all">За всё время</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Зачислено на баланс"
            sub="всего за период работы"
            money
            value={p.totalPaidOutRub}
          />
          <KpiCard label="Активации" sub="по реферальным кодам" value={p.usersActivated} highlight />
          <KpiCard label="Депозитов" sub="количество" value={p.depositsCount} />
          <KpiCard label="Оборот депозитов" sub="₽" money value={p.depositsVolumeRub} />
          <KpiCard
            label="Ожидает зачисления"
            sub="после одобрения админа"
            money
            value={p.totalEarnedPendingRub}
          />
        </div>

        {statsErr ? (
          <p className="text-sm text-red-400">{statsErr}</p>
        ) : loadingStats ? (
          <p className="text-sm text-zinc-500">Загрузка данных периода…</p>
        ) : stats ? (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Разбивка за период
                </h3>
                <span className="text-[10px] text-zinc-600">{periodLabel(period.from, period.to)}</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111]/80">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-zinc-500">
                      <th className="px-4 py-3 font-semibold">Категория</th>
                      <th className="px-4 py-3 font-semibold">Сумма</th>
                      <th className="px-4 py-3 text-right font-semibold">События</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    <tr>
                      <td className="px-4 py-3.5 text-zinc-300">Начисления партнёру</td>
                      <td className="px-4 py-3.5 font-mono text-cb-flame">
                        <SiteMoney value={stats.totals.rewardRub} className="inline text-cb-flame" />
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-zinc-400">{stats.totals.count}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3.5 text-zinc-300">Нетто-депозиты (база)</td>
                      <td className="px-4 py-3.5 font-mono text-zinc-400">
                        <SiteMoney value={stats.totals.netDepositRub} className="inline text-zinc-400" />
                      </td>
                      <td className="px-4 py-3.5 text-right text-zinc-600">—</td>
                    </tr>
                    {p.totalEarnedConfirmedRub > 0 ? (
                      <tr>
                        <td className="px-4 py-3.5 text-zinc-500">Архив (старые подтверждения)</td>
                        <td className="px-4 py-3.5 font-mono text-zinc-500">
                          <SiteMoney value={p.totalEarnedConfirmedRub} className="inline" />
                        </td>
                        <td className="px-4 py-3.5 text-right text-zinc-600">—</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Динамика начислений
                </h3>
                <p className="mt-1 text-[10px] text-zinc-600">По дням, ₽</p>
              </div>
              <div className="flex h-[280px] flex-col rounded-2xl border border-white/[0.06] bg-[#111]/80 p-4">
                {stats.series.length > 0 ? (
                  <div className="flex h-full min-h-0 flex-1 items-end gap-1">
                    {stats.series.map((row, i) => {
                      const h = Math.max(6, Math.round((row.rewardRub / maxBar) * 100));
                      const isPeak = i === peakIdx;
                      return (
                        <div
                          key={row.day}
                          className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                          title={`${row.day}: ${row.rewardRub} ₽`}
                        >
                          <div
                            className={`w-full max-w-[28px] rounded-t transition ${
                              isPeak
                                ? "bg-gradient-to-t from-red-700 to-cb-flame shadow-[0_0_20px_rgba(255,49,49,0.35)]"
                                : "bg-zinc-800 group-hover:bg-zinc-700"
                            }`}
                            style={{ height: `${h}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">
                    Нет данных за выбранный период
                  </div>
                )}
                {stats.series.length > 0 ? (
                  <div className="mt-3 flex justify-between gap-1 border-t border-white/[0.04] pt-2 text-[9px] text-zinc-600">
                    {stats.series.map((row) => (
                      <span key={row.day} className="min-w-0 flex-1 truncate text-center font-mono">
                        {row.day.slice(5)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      ) : null}

      {tab === "material" ? (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">Материал</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Баннер и материалы для продвижения StormBattle — можно размещать на стримах и в соцсетях.
            </p>
          </div>
          <PartnerMaterialBannerShare partnerPromoCode={materialPartnerPromoCode} />
          <PartnerMaterialBanner partnerPromoCode={materialPartnerPromoCode} />
        </div>
      ) : null}

      {tab === "faq" ? <PartnerFaqAccordion /> : null}
    </div>
  );
}

function KpiCard({
  label,
  sub,
  value,
  money,
  highlight,
}: {
  label: string;
  sub?: string;
  value: number;
  money?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        highlight
          ? "border-cb-flame/50 bg-gradient-to-br from-cb-flame/[0.12] to-transparent shadow-[0_0_24px_rgba(255,49,49,0.12)]"
          : "border-white/[0.06] bg-[#0c0c0c]"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      {sub ? <p className="text-[9px] text-zinc-600">{sub}</p> : null}
      <p className="mt-2 text-xl font-black tabular-nums text-white sm:text-2xl">
        {money ? (
          <SiteMoney value={value} className="inline text-white" />
        ) : (
          value.toLocaleString("ru-RU")
        )}
      </p>
    </div>
  );
}
