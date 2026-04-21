"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PartnerLevelHudOrb } from "@/components/PartnerLevelHudOrb";
import { SiteMoney } from "@/components/SiteMoney";

type PartnerLevelReward = {
  level: number;
  repeatDepositBonusPercent: number;
  referralsFrom: number;
};
type PartnerPromoCodeRow = {
  id: string;
  code: string;
  active: boolean;
  depositBonusPercent?: number;
};
type WithdrawalHistoryRow = {
  at: string;
  amountRub: number;
  items: number;
};

const PARTNER_LEVEL_REWARDS: PartnerLevelReward[] = [
  { level: 1, repeatDepositBonusPercent: 15, referralsFrom: 0 },
  { level: 2, repeatDepositBonusPercent: 20, referralsFrom: 200 },
  { level: 3, repeatDepositBonusPercent: 25, referralsFrom: 500 },
  { level: 4, repeatDepositBonusPercent: 30, referralsFrom: 1000 },
  { level: 5, repeatDepositBonusPercent: 35, referralsFrom: 2500 },
];

function levelFromReferrals(referralsCount: number) {
  let level = 1;
  for (const row of PARTNER_LEVEL_REWARDS) {
    if (referralsCount >= row.referralsFrom) level = row.level;
  }
  return level;
}

function nextLevelTarget(currentLevel: number): number | null {
  const next = PARTNER_LEVEL_REWARDS.find((x) => x.level === currentLevel + 1);
  return next ? next.referralsFrom : null;
}

function currentLevelStart(currentLevel: number): number {
  const cur = PARTNER_LEVEL_REWARDS.find((x) => x.level === currentLevel);
  return cur ? cur.referralsFrom : 0;
}

function LevelRewardCard({ reward }: { reward: PartnerLevelReward }) {
  return (
    <article className="w-full rounded-2xl border border-[#2a2a2a] bg-gradient-to-b from-[#121521] to-[#0b0d16] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="space-y-1 text-[13px] leading-relaxed text-zinc-300 xl:text-[14px]">
        <p>
          Бонус к депозитам:{" "}
          <span className="font-extrabold text-amber-300">{reward.repeatDepositBonusPercent}%</span>
        </p>
      </div>
    </article>
  );
}

export function PartnerLevelsProgress({
  initialReferralsCount,
  totalEarnedRub,
  pendingEarnedRub,
  totalPaidOutRub,
  promoCodes,
  onBalanceClaimed,
}: {
  initialReferralsCount: number;
  totalEarnedRub: number;
  pendingEarnedRub: number;
  totalPaidOutRub: number;
  promoCodes: PartnerPromoCodeRow[];
  onBalanceClaimed?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"codes" | "withdrawalsHistory">("codes");
  const [codes, setCodes] = useState<PartnerPromoCodeRow[]>(promoCodes);
  const [newCode, setNewCode] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editPromoId, setEditPromoId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editing, setEditing] = useState(false);
  const [cleaningCodes, setCleaningCodes] = useState(false);
  const [claimingBalance, setClaimingBalance] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [withdrawalHistoryRows, setWithdrawalHistoryRows] = useState<WithdrawalHistoryRow[]>([]);
  const [loadingWithdrawalHistory, setLoadingWithdrawalHistory] = useState(false);
  const [withdrawalHistoryError, setWithdrawalHistoryError] = useState<string | null>(null);
  const baseReferralsCount = Math.max(0, Math.floor(Number(initialReferralsCount) || 0));
  const currentLevel = levelFromReferrals(baseReferralsCount);
  const realPendingEarnedRub = Math.max(0, Math.floor(Number(pendingEarnedRub) || 0));
  const displayEarnedRub = Math.max(realPendingEarnedRub, Math.floor(Number(totalEarnedRub) || 0));
  const displayPaidOutRub = Math.max(0, Math.floor(Number(totalPaidOutRub) || 0));
  const currentLevelBonusPercent =
    PARTNER_LEVEL_REWARDS.find((x) => x.level === currentLevel)?.repeatDepositBonusPercent || 15;
  const nextTarget = nextLevelTarget(currentLevel);
  const startTarget = currentLevelStart(currentLevel);
  const fillPercent =
    nextTarget == null
      ? 100
      : Math.max(0, Math.min(100, ((baseReferralsCount - startTarget) / (nextTarget - startTarget)) * 100));

  useEffect(() => {
    setCodes(promoCodes);
  }, [promoCodes]);

  const onClearPromos = useCallback(async () => {
    setCreateError(null);
    setCleaningCodes(true);
    const r = await apiFetch<{ ok: boolean; codes: PartnerPromoCodeRow[] }>("/api/partner/promo-codes", {
      method: "DELETE",
    });
    setCleaningCodes(false);
    if (!r.ok) {
      setCreateError(r.error || "Не удалось удалить промокоды");
      return false;
    }
    setCodes(r.data?.codes ?? []);
    return true;
  }, []);

  useEffect(() => {
    const cleanupFlag = "partner-promo-codes-cleaned-v1";
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(cleanupFlag) === "1") return;
    if (!promoCodes.length) {
      window.localStorage.setItem(cleanupFlag, "1");
      return;
    }
    void onClearPromos().then((ok) => {
      if (ok) window.localStorage.setItem(cleanupFlag, "1");
    });
  }, [onClearPromos, promoCodes]);

  const onCreatePromo = async () => {
    if (codes.length >= 1) {
      setCreateError("Можно создать только один промокод");
      return;
    }
    const code = newCode.trim();
    if (!/^[A-Za-z0-9]{2,48}$/.test(code)) {
      setCreateError("Промокод только на English (A-Z, 0-9), длина 2-48 символов");
      return;
    }
    setCreateError(null);
    setCreating(true);
    const r = await apiFetch<{ codes: PartnerPromoCodeRow[] }>("/api/partner/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setCreating(false);
    if (!r.ok) {
      setCreateError(r.error || "Не удалось создать промокод");
      return;
    }
    setCodes(r.data?.codes ?? []);
    setNewCode("");
  };

  const onStartEditPromo = (row: PartnerPromoCodeRow) => {
    setCreateError(null);
    setEditPromoId(row.id);
    setEditCode(String(row.code || ""));
  };

  const onSaveEditPromo = async () => {
    if (!editPromoId) return;
    const code = editCode.trim();
    if (!/^[A-Za-z0-9]{2,48}$/.test(code)) {
      setCreateError("Промокод только на English (A-Z, 0-9), длина 2-48 символов");
      return;
    }
    setCreateError(null);
    setEditing(true);
    const r = await apiFetch<{ ok: boolean; codes: PartnerPromoCodeRow[] }>(
      `/api/partner/promo-codes/${encodeURIComponent(editPromoId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      },
    );
    setEditing(false);
    if (!r.ok) {
      setCreateError(r.error || "Не удалось изменить промокод");
      return;
    }
    setCodes(r.data?.codes ?? []);
    setEditPromoId(null);
    setEditCode("");
  };

  const onClaimBalance = async () => {
    setClaimError(null);
    if (displayEarnedRub < 1) {
      setClaimError("Нет суммы для вывода");
      return;
    }
    setClaimingBalance(true);
    const r = await apiFetch<{ ok: boolean; amountRub: number }>("/api/partner/withdrawals/claim", {
      method: "POST",
    });
    setClaimingBalance(false);
    if (!r.ok) {
      setClaimError(r.error || "Не удалось зачислить на баланс");
      return;
    }
    window.dispatchEvent(new Event("cd-balance-updated"));
    setWithdrawalHistoryRows([]);
    if (activeTab === "withdrawalsHistory") {
      setLoadingWithdrawalHistory(true);
    }
    onBalanceClaimed?.();
  };

  useEffect(() => {
    if (activeTab !== "withdrawalsHistory") return;
    let cancelled = false;
    setWithdrawalHistoryError(null);
    setLoadingWithdrawalHistory(true);
    void (async () => {
      const r = await apiFetch<{ rows: WithdrawalHistoryRow[] }>("/api/partner/withdrawals/history");
      if (cancelled) return;
      setLoadingWithdrawalHistory(false);
      if (!r.ok) {
        setWithdrawalHistoryError(r.error || "Не удалось загрузить историю выводов");
        return;
      }
      setWithdrawalHistoryRows(r.data?.rows ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  return (
    <div className="space-y-7">
      <div className="pb-2">
        <div className="flex items-start gap-2">
          {PARTNER_LEVEL_REWARDS.map((reward) => {
            const isShattered = reward.level < currentLevel;
            return (
              <div
                key={reward.level}
                className={`group relative flex min-w-0 flex-1 flex-col items-center gap-2 overflow-visible rounded-2xl p-1 transition duration-300 hover:scale-[1.03] ${
                  reward.level <= currentLevel ? "" : "opacity-80"
                }`}
              >
                <div
                  className={`transition-transform duration-300 group-hover:scale-110 ${
                    isShattered ? "relative z-[2] saturate-0 brightness-75 transition-[filter] duration-500" : ""
                  }`}
                >
                  <PartnerLevelHudOrb level={reward.level} showUnit={false} />
                </div>
                <div
                  className={
                    isShattered
                      ? "relative z-[2] w-full opacity-80 saturate-0 transition-[filter,opacity] duration-500"
                      : "w-full"
                  }
                >
                  <LevelRewardCard reward={reward} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-2">
        <div className="mb-2 flex items-center justify-end">
          <span className="inline-flex items-center gap-2 px-4 py-2 text-base font-extrabold tracking-wide text-zinc-100">
            <span className="h-2.5 w-2.5 rounded-full bg-cb-flame shadow-[0_0_10px_rgba(255,49,49,0.9)]" />
            Рефералов сейчас:
            <span className="font-mono text-xl leading-none text-cb-flame">{baseReferralsCount}</span>
          </span>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-0">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,49,49,0.14),transparent_55%)]" />
          <div className="relative h-8 overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.06]">
            <div className="liquid-red-fill relative h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${fillPercent}%` }}>
              <div className="lightning-particles" />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_25%,rgba(255,255,255,0.25)_35%,transparent_45%)] opacity-60" />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="grid gap-[12rem] sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.06] bg-[#10131e] px-5 py-4">
            <div className="flex items-center gap-2 text-cb-flame">
              <span className="text-lg">👤</span>
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Приглашено</p>
            </div>
            <p className="mt-1 text-3xl font-black text-white">{baseReferralsCount}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-[#10131e] px-5 py-4">
            <div className="flex items-center gap-2 text-cb-flame">
              <span className="text-lg">$</span>
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Заработано</p>
            </div>
            <div className="mt-1 flex items-start justify-between gap-3">
              <p className="text-3xl font-black text-white">
                <SiteMoney value={displayEarnedRub} className="inline text-white" />
              </p>
              <button
                type="button"
                onClick={() => void onClaimBalance()}
                disabled={claimingBalance || displayEarnedRub < 1}
                className="h-9 rounded-xl border border-cb-flame/35 bg-cb-flame/85 px-4 text-xs font-black uppercase tracking-wide text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {claimingBalance ? "Вывожу..." : "Вывод"}
              </button>
            </div>
          </div>
        </div>
        {claimError ? (
          <p className="text-sm text-red-400">{claimError}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("codes")}
            className={`rounded-xl px-8 py-3.5 text-base font-semibold transition ${
              activeTab === "codes"
                ? "bg-cb-flame/20 text-cb-flame ring-1 ring-cb-flame/40"
                : "bg-black/30 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Промокоды
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("withdrawalsHistory")}
            className={`rounded-xl px-8 py-3.5 text-base font-semibold transition ${
              activeTab === "withdrawalsHistory"
                ? "bg-cb-flame/20 text-cb-flame ring-1 ring-cb-flame/40"
                : "bg-black/30 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            История выводов
          </button>
        </div>

        <div className="space-y-3">
          {activeTab === "codes" ? (
            <>
            <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2.5">
              <input
                type="text"
                placeholder="Название промокода"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                disabled={codes.length >= 1 || cleaningCodes}
                className="h-12 w-[18rem] max-w-full rounded-2xl border border-cb-flame/55 bg-[#0b0d16] px-4 text-base font-semibold text-zinc-100 placeholder:text-zinc-600"
              />
              <button
                type="button"
                onClick={() => void onCreatePromo()}
                disabled={creating || cleaningCodes || codes.length >= 1}
                className="h-12 w-[13.5rem] max-w-full rounded-2xl border border-cb-flame/35 bg-cb-flame/85 px-5 text-sm font-black uppercase tracking-wide text-black transition hover:brightness-110"
              >
                {creating ? "Создаю..." : codes.length >= 1 ? "Промокод уже создан" : "Создать промокод"}
              </button>
            </div>
            {createError ? <p className="text-sm text-red-400">{createError}</p> : null}
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0f1220]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[13px] text-[#c8a055]">
                    <th className="px-4 py-3 font-semibold">Промокод</th>
                    <th className="px-4 py-3 font-semibold">Активаций</th>
                    <th className="px-4 py-3 font-semibold">Выплачено</th>
                    <th className="px-4 py-3 font-semibold">Промокод на</th>
                    <th className="px-4 py-3 font-semibold"> </th>
                  </tr>
                </thead>
                <tbody>
                  {(codes.length ? codes : [{ id: "empty", code: "—", active: false }]).map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-semibold text-zinc-200">{row.code}</td>
                      <td className="px-4 py-3 text-zinc-300">
                        {row.id === "empty" ? 0 : Math.max(0, Math.floor(Number(baseReferralsCount) || 0))}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {row.id === "empty" ? 0 : (
                          <SiteMoney
                            value={displayPaidOutRub}
                            className="inline text-zinc-300"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-200">
                        {row.id === "empty" ? "—" : `${currentLevelBonusPercent}%`}
                      </td>
                      <td className="px-4 py-3">
                        {row.id === "empty" ? null : editPromoId === row.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="text"
                              value={editCode}
                              onChange={(e) => setEditCode(e.target.value)}
                              maxLength={48}
                              className="h-8 w-36 rounded-lg border border-cb-flame/50 bg-transparent px-2 text-xs font-semibold text-zinc-100"
                            />
                            <button
                              type="button"
                              onClick={() => void onSaveEditPromo()}
                              disabled={editing}
                              className="rounded-full bg-[#f6c24e] px-3 py-1 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-70"
                            >
                              {editing ? "..." : "Сохранить"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditPromoId(null);
                                setEditCode("");
                              }}
                              className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-zinc-300 transition hover:bg-white/10"
                            >
                              Отмена
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onStartEditPromo(row)}
                            className="rounded-full bg-[#f6c24e] px-3 py-1 text-xs font-semibold text-black transition hover:brightness-110"
                          >
                            Редактировать
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          ) : null}
          {activeTab === "withdrawalsHistory" ? (
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0f1220]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[13px] text-[#c8a055]">
                    <th className="px-4 py-3 font-semibold">Дата</th>
                    <th className="px-4 py-3 font-semibold">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingWithdrawalHistory ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-4 text-zinc-400">
                        Загрузка...
                      </td>
                    </tr>
                  ) : withdrawalHistoryError ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-4 text-red-400">
                        {withdrawalHistoryError}
                      </td>
                    </tr>
                  ) : withdrawalHistoryRows.length ? (
                    withdrawalHistoryRows.map((row, idx) => (
                      <tr key={`${row.at}-${idx}`} className="border-b border-white/[0.03] last:border-b-0">
                        <td className="px-4 py-3 text-zinc-300">
                          {row.at ? new Date(row.at).toLocaleString("ru-RU") : "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-zinc-100">
                          <SiteMoney value={row.amountRub} className="inline text-white" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-4 py-4 text-zinc-400">
                        Выводов пока не было
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        .liquid-red-fill {
          background:
            linear-gradient(90deg, rgba(255, 40, 40, 0.98) 0%, rgba(255, 65, 65, 0.95) 45%, rgba(255, 35, 35, 0.98) 100%);
          box-shadow: 0 0 20px rgba(255, 49, 49, 0.5), inset 0 -2px 8px rgba(120, 0, 0, 0.45);
          overflow: hidden;
        }
        .lightning-particles {
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(
              112deg,
              rgba(255, 220, 220, 0) 0px,
              rgba(255, 220, 220, 0) 13px,
              rgba(255, 235, 235, 0.48) 14px,
              rgba(255, 235, 235, 0) 17px
            ),
            repeating-linear-gradient(
              -64deg,
              rgba(255, 160, 160, 0) 0px,
              rgba(255, 160, 160, 0) 18px,
              rgba(255, 200, 200, 0.35) 19px,
              rgba(255, 160, 160, 0) 22px
            );
          mix-blend-mode: screen;
          opacity: 0.9;
          animation: lightningFlow 1.35s linear infinite;
        }
        @keyframes lightningFlow {
          from { transform: translateX(0); }
          to { transform: translateX(26px); }
        }
      `}</style>
    </div>
  );
}
