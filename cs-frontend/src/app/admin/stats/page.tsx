"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { SITE_CURRENCY_CODE } from "@/lib/money";

type RangePreset = "1h" | "24h" | "7d" | "30d" | "all";

type SiteStatsPayload = {
  generatedAt: string;
  range: { preset: string; from: string; to: string };
  snapshot: {
    usersRegistered: number;
    totalBalanceRub: number;
    totalInventorySellPriceRub: number;
    combinedLiabilitiesRub: number;
    note?: string;
  };
  online: {
    count: number | null;
    windowMinutes: number;
    unavailable?: boolean;
  };
  inRange: {
    newRegisteredUsersCount: number | null;
    newRegisteredUsersUnavailable?: boolean;
    turnoverRub: number;
    crypto: {
      cryptoOrdersCreatedInRange: number;
      cryptoDepositsCreditedInRange: number;
      cryptoCreditedVolumeRub: number;
      uniqueCryptoDepositorsInRange: number;
    };
    promoAndAdmin: {
      promoBalanceGrantsRub: number;
      promoGrantEvents: number;
      adminManualCreditsRub: number;
      adminManualCreditEvents: number;
      totalNonCryptoCreditsRub: number;
    };
    withdrawals: {
      withdrawalsCreatedInRange: number;
      withdrawalsCompletedInRange: number;
      withdrawalsCompletedValueRub: number;
    };
    activity: {
      caseOpens: number;
      caseOpenSpendRub: number;
      upgrades: number;
      upgradeStakeRub: number;
      activePlayersDistinct: number;
      unavailable?: boolean;
    };
  };
};

function fmtInt(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("ru-RU").format(Math.floor(n));
}

function fmtRub(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${new Intl.NumberFormat("ru-RU").format(Math.floor(n))} ${SITE_CURRENCY_CODE}`;
}

function fmtIso(iso: string) {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: "1h", label: "1 час" },
  { id: "24h", label: "24 часа" },
  { id: "7d", label: "7 дней" },
  { id: "30d", label: "30 дней" },
  { id: "all", label: "Всё время" },
];

function StatBlock({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-cb-stroke bg-cb-panel/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${className}`}
    >
      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">{title}</h3>
      <div className="mt-3 space-y-2 text-sm text-zinc-200">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.04] pb-2 last:border-0 last:pb-0">
      <span className="text-zinc-400">{label}</span>
      <span className="font-mono text-right font-semibold text-white">{value}</span>
    </div>
  );
}

export default function AdminSiteStatsPage() {
  const [preset, setPreset] = useState<RangePreset>("24h");
  const [data, setData] = useState<SiteStatsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: RangePreset) => {
    setLoading(true);
    setErr(null);
    const r = await apiFetch<SiteStatsPayload>(`/api/admin/site-stats?range=${encodeURIComponent(p)}`);
    setLoading(false);
    if (!r.ok) {
      setErr(r.error || "Не удалось загрузить");
      setData(null);
      return;
    }
    setData(r.data || null);
  }, []);

  useEffect(() => {
    void load(preset);
  }, [preset, load]);

  const ir = data?.inRange;
  const snap = data?.snapshot;
  const on = data?.online;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Статистика сайта</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-500">
            Снимок балансов и активность за выбранный период. «Онлайн» — пользователи с обновлением профиля за последние{" "}
            {on?.windowMinutes ?? 15} мин. Пополнения: зачисленные крипто-платежи, промокоды на баланс и ручные начисления
            админа.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(preset)}
          disabled={loading}
          className="shrink-0 rounded-xl border border-cb-stroke bg-black/40 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-amber-500/50 hover:text-white disabled:opacity-50"
        >
          {loading ? "…" : "Обновить"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPreset(p.id)}
            className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wide transition sm:text-sm ${
              preset === p.id
                ? "border-amber-500/60 bg-amber-950/40 text-amber-100"
                : "border-cb-stroke bg-black/30 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {data ? (
        <p className="text-xs text-zinc-600">
          Период: <span className="text-zinc-400">{fmtIso(data.range.from)}</span> —{" "}
          <span className="text-zinc-400">{fmtIso(data.range.to)}</span>
          <span className="ml-2 text-zinc-500">· обновлено {fmtIso(data.generatedAt)}</span>
        </p>
      ) : null}

      {err ? (
        <p className="rounded-xl border border-red-500/35 bg-red-950/20 px-4 py-3 text-sm text-red-300">{err}</p>
      ) : null}

      {!loading && data && snap ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <StatBlock title="Сейчас (снимок)">
            <Row label="Зарегистрировано пользователей" value={fmtInt(snap.usersRegistered)} />
            <Row label={`Сумма балансов (${SITE_CURRENCY_CODE})`} value={fmtRub(snap.totalBalanceRub)} />
            <Row label="Оценка скинов в инвентарях" value={fmtRub(snap.totalInventorySellPriceRub)} />
            <Row
              label="Баланс + инвентарь (обязательства)"
              value={<span className="text-amber-200/95">{fmtRub(snap.combinedLiabilitiesRub)}</span>}
            />
            {snap.note ? <p className="text-[11px] leading-snug text-amber-200/70">{snap.note}</p> : null}
          </StatBlock>

          <StatBlock title="Онлайн">
            {on?.unavailable ? (
              <p className="text-xs text-zinc-500">Недоступно в режиме без MongoDB (in-memory).</p>
            ) : (
              <Row
                label={`Активность ≤ ${on?.windowMinutes ?? 15} мин`}
                value={<span className="text-emerald-300/95">{fmtInt(on?.count ?? 0)}</span>}
              />
            )}
          </StatBlock>

          <StatBlock title="За выбранный период — оборот">
            <Row
              label="Итого оборот (условно)"
              value={<span className="text-cb-flame">{fmtRub(ir?.turnoverRub)}</span>}
            />
            <p className="text-[10px] leading-relaxed text-zinc-600">
              Открытия кейсов + ставки апгрейдов + зачисления (крипта, промо, админ).
            </p>
          </StatBlock>

          <StatBlock title="Пополнения и игроки">
            <Row
              label="Новых регистраций"
              value={
                ir?.newRegisteredUsersUnavailable ? (
                  "—"
                ) : (
                  fmtInt(ir?.newRegisteredUsersCount ?? 0)
                )
              }
            />
            <Row label="Уникальных с крипто-зачислением" value={fmtInt(ir?.crypto.uniqueCryptoDepositorsInRange)} />
            <Row label="Крипто-заявок создано" value={fmtInt(ir?.crypto.cryptoOrdersCreatedInRange)} />
            <Row label="Крипто-зачислений (штук)" value={fmtInt(ir?.crypto.cryptoDepositsCreditedInRange)} />
            <Row label="Сумма крипто-зачислений" value={fmtRub(ir?.crypto.cryptoCreditedVolumeRub)} />
            <Row label="Промо на баланс (события)" value={fmtInt(ir?.promoAndAdmin.promoGrantEvents)} />
            <Row label="Промо на баланс (сумма)" value={fmtRub(ir?.promoAndAdmin.promoBalanceGrantsRub)} />
            <Row label="Админ начислил (события)" value={fmtInt(ir?.promoAndAdmin.adminManualCreditEvents)} />
            <Row label="Админ начислил (сумма)" value={fmtRub(ir?.promoAndAdmin.adminManualCreditsRub)} />
          </StatBlock>

          <StatBlock title="Выводы Market.csgo">
            <Row label="Заявок создано" value={fmtInt(ir?.withdrawals.withdrawalsCreatedInRange)} />
            <Row label="Завершено (штук)" value={fmtInt(ir?.withdrawals.withdrawalsCompletedInRange)} />
            <Row label="Сумма sellPrice завершённых" value={fmtRub(ir?.withdrawals.withdrawalsCompletedValueRub)} />
          </StatBlock>

          <StatBlock title="Активность (кейсы / апгрейды)">
            {ir?.activity.unavailable ? (
              <p className="text-xs text-zinc-500">Логи недоступны.</p>
            ) : (
              <>
                <Row label="Открытий кейсов" value={fmtInt(ir?.activity.caseOpens)} />
                <Row label="Потрачено на кейсы" value={fmtRub(ir?.activity.caseOpenSpendRub)} />
                <Row label="Апгрейдов" value={fmtInt(ir?.activity.upgrades)} />
                <Row label="Сумма ставок апгрейдов" value={fmtRub(ir?.activity.upgradeStakeRub)} />
                <Row
                  label="Уникальных игроков (логи)"
                  value={fmtInt(ir?.activity.activePlayersDistinct)}
                />
              </>
            )}
          </StatBlock>
        </div>
      ) : loading ? (
        <p className="text-sm text-zinc-500">Загрузка…</p>
      ) : null}
    </div>
  );
}
