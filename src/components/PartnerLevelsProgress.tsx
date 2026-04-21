"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PartnerLevelHudOrb } from "@/components/PartnerLevelHudOrb";
import { StormCoinSymbol } from "@/components/StormCoinSymbol";
import { SiteMoney } from "@/components/SiteMoney";

type PartnerLevelReward = {
  level: number;
  repeatDepositBonusPercent: number;
  referralsFrom: number;
  rewardCoins: number;
};
type PartnerPromoCodeRow = {
  id: string;
  code: string;
  active: boolean;
  depositBonusPercent?: number;
};

const PARTNER_LEVEL_REWARDS: PartnerLevelReward[] = [
  { level: 1, repeatDepositBonusPercent: 20, referralsFrom: 0, rewardCoins: 150 },
  { level: 2, repeatDepositBonusPercent: 20, referralsFrom: 200, rewardCoins: 250 },
  { level: 3, repeatDepositBonusPercent: 22, referralsFrom: 500, rewardCoins: 400 },
  { level: 4, repeatDepositBonusPercent: 25, referralsFrom: 1000, rewardCoins: 650 },
  { level: 5, repeatDepositBonusPercent: 30, referralsFrom: 2500, rewardCoins: 1000 },
];

const MAX_REFERRALS_SCALE = 2500;
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
        <p>
          Награда: <span className="font-extrabold text-amber-300">{reward.rewardCoins}</span>{" "}
          <StormCoinSymbol className="mx-0.5 inline-block h-[1.05em] w-[1.05em] align-[-0.12em]" title="storm-coin" />
        </p>
      </div>
    </article>
  );
}

export function PartnerLevelsProgress({
  initialReferralsCount,
  totalEarnedRub,
  promoCodes,
}: {
  initialReferralsCount: number;
  totalEarnedRub: number;
  promoCodes: PartnerPromoCodeRow[];
}) {
  const [activeTab, setActiveTab] = useState<"codes" | "withdrawals" | "deposits">("codes");
  const [codes, setCodes] = useState<PartnerPromoCodeRow[]>(promoCodes);
  const [newCode, setNewCode] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [cleaningCodes, setCleaningCodes] = useState(false);
  const effectiveReferralsCount = Math.max(0, Math.floor(Number(initialReferralsCount) || 0));
  const currentLevel = levelFromReferrals(effectiveReferralsCount);
  const nextTarget = nextLevelTarget(currentLevel);
  const startTarget = currentLevelStart(currentLevel);
  const fillPercent =
    nextTarget == null
      ? 100
      : Math.max(0, Math.min(100, ((effectiveReferralsCount - startTarget) / (nextTarget - startTarget)) * 100));

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

  return (
    <div className="space-y-3">
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

      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-4">
        <div className="mb-2 flex items-center justify-end">
          <span className="inline-flex items-center gap-2 rounded-xl border border-cb-flame/30 bg-gradient-to-r from-cb-flame/[0.18] via-cb-flame/[0.1] to-transparent px-4 py-2 text-base font-extrabold tracking-wide text-zinc-100 shadow-[0_0_18px_rgba(255,49,49,0.18)]">
            <span className="h-2.5 w-2.5 rounded-full bg-cb-flame shadow-[0_0_10px_rgba(255,49,49,0.9)]" />
            Рефералов сейчас:
            <span className="font-mono text-xl leading-none text-cb-flame">{effectiveReferralsCount}</span>
          </span>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-cb-flame/25 bg-[#0a0b11] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_24px_rgba(255,49,49,0.08)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,49,49,0.14),transparent_55%)]" />
          <div className="relative h-8 overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.06]">
            <div className="liquid-red-fill relative h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${fillPercent}%` }}>
              <div className="lightning-particles" />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_25%,rgba(255,255,255,0.25)_35%,transparent_45%)] opacity-60" />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#0b0d16] p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.06] bg-[#10131e] px-5 py-4">
            <div className="flex items-center gap-2 text-cb-flame">
              <span className="text-lg">👤</span>
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Приглашено</p>
            </div>
            <p className="mt-1 text-3xl font-black text-white">{effectiveReferralsCount}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-[#10131e] px-5 py-4">
            <div className="flex items-center gap-2 text-cb-flame">
              <span className="text-lg">$</span>
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Заработано</p>
            </div>
            <p className="mt-1 text-3xl font-black text-white">
              <SiteMoney value={totalEarnedRub} className="inline text-white" />
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("codes")}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === "codes"
                ? "bg-cb-flame/20 text-cb-flame ring-1 ring-cb-flame/40"
                : "bg-black/30 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Промокоды
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("withdrawals")}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === "withdrawals"
                ? "bg-cb-flame/20 text-cb-flame ring-1 ring-cb-flame/40"
                : "bg-black/30 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Выводы
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("deposits")}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === "deposits"
                ? "bg-cb-flame/20 text-cb-flame ring-1 ring-cb-flame/40"
                : "bg-black/30 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            История пополнений
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
                      <td className="px-4 py-3 text-zinc-300">0</td>
                      <td className="px-4 py-3 text-zinc-300">0</td>
                      <td className="px-4 py-3 text-zinc-200">
                        {row.depositBonusPercent != null ? `${row.depositBonusPercent}%` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button className="rounded-full bg-[#f6c24e] px-3 py-1 text-xs font-semibold text-black transition hover:brightness-110">
                          Просмотр
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
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
