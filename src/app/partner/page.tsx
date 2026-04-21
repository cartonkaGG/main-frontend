"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PartnerFaqAccordion } from "@/components/PartnerFaqAccordion";
import { PartnerMaterialBanner } from "@/components/PartnerMaterialBanner";
import { PartnerMaterialBannerShare } from "@/components/PartnerMaterialBannerShare";
import { PartnerMaterialWideBannerShare } from "@/components/PartnerMaterialWideBannerShare";
import { PartnerMaterialWideTitleBanner } from "@/components/PartnerMaterialWideTitleBanner";
import { PartnerLevelsProgress } from "@/components/PartnerLevelsProgress";
import { SiteMoney } from "@/components/SiteMoney";
import { usePartnerCabinetTab } from "@/contexts/PartnerCabinetTabContext";

type Dash = {
  partner: {
    id: string;
    percentBps: number;
    percentDisplay: string;
    /** Рівень партнерки / рефералки (стартово 1). */
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

export default function PartnerDashboardPage() {
  const { tab } = usePartnerCabinetTab();
  const [data, setData] = useState<Dash | null>(null);
  const [period, setPeriod] = useState(() => daysAgo(30));
  const [preset, setPreset] = useState<"7" | "30" | "90" | "all">("30");
  const [statsErr, setStatsErr] = useState<string | null>(null);
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
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const q = qs.toString();
    const r = await apiFetch<PeriodStats>(`/api/partner/stats${q ? `?${q}` : ""}`);
    if (!r.ok) {
      setStatsErr(r.error || "Не удалось загрузить статистику");
      return;
    }
  }, []);

  useEffect(() => {
    void loadStats(period.from, period.to);
  }, [period.from, period.to, loadStats]);

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
              <span className="font-mono text-zinc-300">{p.level ?? 1}</span>
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

        <PartnerLevelsProgress
          initialReferralsCount={Math.max(0, Math.floor(Number(p.usersActivated) || 0))}
          totalEarnedRub={Math.max(0, Math.floor(Number(p.totalPaidOutRub) || 0))}
          promoCodes={(data?.codes ?? []).map((c) => ({
            id: c.id,
            code: c.code,
            active: c.active,
            depositBonusPercent: c.depositBonusPercent,
          }))}
        />

        {statsErr ? <p className="text-sm text-red-400">{statsErr}</p> : null}
      </div>
      ) : null}

      {tab === "material" ? (
        <div className="mx-auto w-full max-w-5xl space-y-10">
          <div className="border-b border-white/[0.06] pb-6">
            <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">Материал</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Баннер и материалы для продвижения StormBattle — можно размещать на стримах и в соцсетях.
            </p>
          </div>

          <section className="space-y-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Баннер для OBS и описания</h2>
              <p className="mt-1.5 text-sm text-zinc-400">
                Горизонтальная карточка: логотип, оффер и переворот на промокод — вставьте ссылку ниже в источник «Браузер».
              </p>
            </div>
            <PartnerMaterialBannerShare partnerPromoCode={materialPartnerPromoCode} />
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0c]/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4 md:p-5">
              <PartnerMaterialBanner partnerPromoCode={materialPartnerPromoCode} />
            </div>
          </section>

          <section className="space-y-4 border-t border-white/[0.06] pt-10">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Широкий баннер · анимация</h2>
              <p className="mt-1.5 text-sm text-zinc-400">
                Тексты сменяются по кругу — удобно как заголовок под стримом или в шапке поста.
              </p>
            </div>
            <PartnerMaterialWideBannerShare partnerPromoCode={materialPartnerPromoCode} />
            <div className="flex justify-center overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0c0c0c]/80 px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-5 sm:py-6">
              <PartnerMaterialWideTitleBanner partnerPromoCode={materialPartnerPromoCode} />
            </div>
          </section>
        </div>
      ) : null}

      {tab === "faq" ? <PartnerFaqAccordion showLevels={false} /> : null}
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
