"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { PartnerLevelHudOrb } from "@/components/PartnerLevelHudOrb";
import { StormCoinSymbol } from "@/components/StormCoinSymbol";

type FaqRow = { id: string; question: string; answer: string };
type PartnerLevelReward = {
  level: number;
  repeatDepositBonusPercent: number;
  referralsFrom: number;
  rewardCoins: number;
};

const PARTNER_LEVEL_REWARDS: PartnerLevelReward[] = [
  { level: 1, repeatDepositBonusPercent: 20, referralsFrom: 0, rewardCoins: 150 },
  { level: 2, repeatDepositBonusPercent: 20, referralsFrom: 200, rewardCoins: 250 },
  { level: 3, repeatDepositBonusPercent: 22, referralsFrom: 500, rewardCoins: 400 },
  { level: 4, repeatDepositBonusPercent: 25, referralsFrom: 1000, rewardCoins: 650 },
  { level: 5, repeatDepositBonusPercent: 30, referralsFrom: 2500, rewardCoins: 1000 },
];

type PartnerMeLite = {
  partner?: {
    usersActivated?: number;
    level?: number;
  } | null;
};

function nextLevelTarget(currentLevel: number): number | null {
  const next = PARTNER_LEVEL_REWARDS.find((x) => x.level === currentLevel + 1);
  return next ? next.referralsFrom : null;
}

function currentLevelStart(currentLevel: number): number {
  const cur = PARTNER_LEVEL_REWARDS.find((x) => x.level === currentLevel);
  return cur ? cur.referralsFrom : 0;
}

const MAX_REFERRALS_SCALE = 2500;
const PARTNER_LEVEL_OVERRIDE_KEY = "partner-level-override";
const PARTNER_LEVEL_OVERRIDE_EVENT = "partner-level-override-change";
const PARTNER_LEVEL_PROGRESS_KEY = "partner-level-progress";

/**
 * Після «150» у типовій фразі про мінімальне поповнення — та сама іконка, що в балансі (`StormCoinSymbol`).
 * У тексті з адмінки «от» — кирилиця; також «150» перед комою/крапкою або перед наступним словом.
 * Явно: `:stormcoin:` у будь-якому місці відповіді.
 */
const CYR_OT = "\u043e\u0442"; // «от»
const AFTER_150_RE = new RegExp(
  `(${CYR_OT}\\s)150(\\s*[,.]|\\s+(?=[\\u0410-\\u044F\\u0401\\u0451A-Za-zЁё]))`,
  "gi",
);

function injectStormCoinAfterOt150(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(AFTER_150_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    out.push(m[1], "150");
    out.push(
      <StormCoinSymbol
        key={`${keyPrefix}-sc150-${n}`}
        className="mx-0.5 inline-block h-[1.15em] w-[1.15em] max-h-[1.25em] max-w-[1.25em] align-[-0.14em] drop-shadow-[0_0_6px_rgba(255,49,49,0.35)]"
        title="storm-coin"
      />,
    );
    out.push(m[2]);
    last = start + m[0].length;
    n += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderPartnerFaqAnswerBody(text: string, rowKey: string): ReactNode {
  const chunks = text.split(":stormcoin:");
  return (
    <>
      {chunks.map((chunk, i) => (
        <Fragment key={`${rowKey}-c${i}`}>
          {injectStormCoinAfterOt150(chunk, `${rowKey}-${i}`)}
          {i < chunks.length - 1 ? (
            <StormCoinSymbol
              key={`${rowKey}-scx-${i}`}
              className="mx-0.5 inline-block h-[1.15em] w-[1.15em] max-h-[1.25em] max-w-[1.25em] align-[-0.14em] drop-shadow-[0_0_6px_rgba(255,49,49,0.35)]"
              title="storm-coin"
            />
          ) : null}
        </Fragment>
      ))}
    </>
  );
}

function PlusMinusIcon({ open }: { open: boolean }) {
  return (
    <span className="relative flex h-[15px] w-[15px] items-center justify-center" aria-hidden>
      <span className="absolute h-[3px] w-[15px] rounded-full bg-current" />
      {!open ? <span className="absolute h-[15px] w-[3px] rounded-full bg-current" /> : null}
    </span>
  );
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

export function PartnerFaqAccordion({ showLevels = true }: { showLevels?: boolean }) {
  const baseId = useId();
  const [items, setItems] = useState<FaqRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [referralsCount, setReferralsCount] = useState(0);
  const [previewReferrals, setPreviewReferrals] = useState<number | null>(null);
  const [claimedLevels, setClaimedLevels] = useState<number[]>([]);
  const [progressLevel, setProgressLevel] = useState(1);
  /** Какой подпункт раскрыт; повторный клик по той же строке закрывает. */
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const rFaq = await apiFetch<{ items: FaqRow[] }>("/api/partner/faq");
    if (showLevels) {
      const rMe = await apiFetch<PartnerMeLite>("/api/partner/me");
      const refs = Math.max(0, Math.floor(Number(rMe.data?.partner?.usersActivated) || 0));
      setReferralsCount(refs);
      try {
        const raw = window.localStorage.getItem(PARTNER_LEVEL_PROGRESS_KEY);
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 1 && n <= PARTNER_LEVEL_REWARDS.length) {
          setProgressLevel(Math.floor(n));
        } else {
          setProgressLevel(1);
        }
      } catch {
        setProgressLevel(1);
      }
    }
    setLoading(false);
    if (!rFaq.ok) {
      if (rFaq.status === 404) {
        setErr(
          "Ошибка 404: маршрут /api/partner/faq не найден. Обычно фронт ходит не на бекенд: проверьте .env — " +
            "NEXT_PUBLIC_API_URL=http://127.0.0.1:4000, либо BACKEND_PROXY_URL=http://127.0.0.1:4000 и NEXT_PUBLIC_API_URL=http://localhost:3000 (см. stormbattle/frontend/.env.example). " +
            "Убедитесь, что API запущен и после обновления кода перезапущен."
        );
      } else if (rFaq.status === 503) {
        setErr(rFaq.error || "Справка временно недоступна (нет MongoDB или сервер не готов).");
      } else if (rFaq.status === 403) {
        setErr(rFaq.error || "Нет доступа к разделу партнёра.");
      } else if (rFaq.status === 0) {
        setErr("Нет связи с API — проверьте, что бекенд запущен на порту из NEXT_PUBLIC_API_URL.");
      } else {
        setErr(rFaq.error || "Не удалось загрузить");
      }
      setItems([]);
      return;
    }
    setItems(rFaq.data?.items ?? []);
  }, [showLevels]);

  useEffect(() => {
    void load();
  }, [load]);

  const effectiveReferralsCount = previewReferrals ?? referralsCount;
  const currentLevel = Math.max(1, Math.min(PARTNER_LEVEL_REWARDS.length, progressLevel));
  const nextTarget = nextLevelTarget(currentLevel);
  const startTarget = currentLevelStart(currentLevel);
  const rawFillPercent =
    nextTarget == null
      ? 100
      : Math.max(0, Math.min(100, ((effectiveReferralsCount - startTarget) / (nextTarget - startTarget)) * 100));
  const fillPercent = rawFillPercent;

  return (
    <div className="rounded-3xl border border-white/[0.06] bg-[#050505] p-[1.875rem] sm:p-[2.25rem]">
      <div className="mb-9 space-y-6">
        {showLevels ? (
        <div>
          <div className="pb-2">
            <div className="flex items-start gap-2">
            {PARTNER_LEVEL_REWARDS.map((reward) => (
                (() => {
                  const isReached = effectiveReferralsCount >= reward.referralsFrom;
                  const isClaimed = claimedLevels.includes(reward.level);
                  const isShattered = isClaimed;
                  const isNextTargetCard =
                    reward.level === currentLevel + 1 &&
                    reward.level <= PARTNER_LEVEL_REWARDS.length;
                  const canGoNext = isNextTargetCard && isReached;
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
                <div className={isShattered ? "relative z-[2] w-full opacity-80 saturate-0 transition-[filter,opacity] duration-500" : "w-full"}>
                  <LevelRewardCard reward={reward} />
                </div>
                {canGoNext ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!canGoNext) return;
                      const levelFrom = Math.max(1, reward.level - 1);
                      setClaimedLevels((prev) =>
                        prev.includes(levelFrom) ? prev : [...prev, levelFrom]
                      );
                      setPreviewReferrals((prev) => {
                        const target = reward.referralsFrom;
                        const base = Math.max(0, Math.floor(Number(prev ?? referralsCount) || 0));
                        return Math.max(base, target);
                      });
                      const nextVisualLevel = Math.min(5, reward.level);
                      try {
                        window.localStorage.setItem(PARTNER_LEVEL_PROGRESS_KEY, String(nextVisualLevel));
                        window.localStorage.setItem(PARTNER_LEVEL_OVERRIDE_KEY, String(nextVisualLevel));
                        window.dispatchEvent(
                          new CustomEvent(PARTNER_LEVEL_OVERRIDE_EVENT, { detail: { level: nextVisualLevel } })
                        );
                      } catch {
                        /* */
                      }
                      setProgressLevel(nextVisualLevel);
                    }}
                    disabled={false}
                    className="mt-1 inline-flex h-9 items-center justify-center rounded-xl border border-cb-flame/45 bg-gradient-to-r from-cb-flame/90 to-red-500 px-4 text-sm font-bold text-white shadow-[0_0_14px_rgba(255,49,49,0.35)] transition hover:brightness-110"
                  >
                    Перейти на следующий уровень
                  </button>
                ) : null}
              </div>
                  );
                })()
            ))}
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-white/[0.08] bg-[#0c0d14] p-4">
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
                <div
                  className="liquid-red-fill relative h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${fillPercent}%` }}
                >
                  <div className="lightning-particles" />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_25%,rgba(255,255,255,0.25)_35%,transparent_45%)] opacity-60" />
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2">
              <input
                type="range"
                min={0}
                max={MAX_REFERRALS_SCALE}
                step={1}
                value={effectiveReferralsCount}
                onChange={(e) => setPreviewReferrals(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                className="w-full accent-cb-flame"
                aria-label="Тестовый ползунок заполнения шкалы"
              />
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewReferrals(0);
                    setClaimedLevels([]);
                    setProgressLevel(1);
                    try {
                      window.localStorage.removeItem(PARTNER_LEVEL_PROGRESS_KEY);
                      window.localStorage.removeItem(PARTNER_LEVEL_OVERRIDE_KEY);
                      window.dispatchEvent(
                        new CustomEvent(PARTNER_LEVEL_OVERRIDE_EVENT, { detail: { level: 1 } })
                      );
                    } catch {
                      /* */
                    }
                  }}
                  className="text-zinc-500 transition hover:text-zinc-300"
                >
                  Сброс
                </button>
                <span className="font-mono text-zinc-400">{effectiveReferralsCount}</span>
              </div>
            </div>
          </div>
        </div>
        ) : null}
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Ответы на вопросы</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-[1.125rem] py-[3.75rem] text-base text-zinc-500">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
          Загрузка…
        </div>
      ) : err ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-950/20 px-6 py-4 text-base leading-relaxed text-red-300">
          {err}
        </p>
      ) : !items?.length ? (
        <p className="rounded-2xl border border-dashed border-white/[0.1] bg-zinc-950/80 px-6 py-12 text-center text-base leading-relaxed text-zinc-500">
          Пока нет подпунктов. Администратор может добавить их в админ-панели: «F.A.Q партнеров».
        </p>
      ) : (
        <ul className="flex flex-col gap-4 sm:gap-[1.125rem]" role="list">
          {items.map((row) => {
            const open = openId === row.id;
            const panelId = `${baseId}-panel-${row.id}`;
            const headerId = `${baseId}-header-${row.id}`;
            return (
              <li key={row.id} className="overflow-hidden rounded-2xl bg-[#1c1c1c] ring-1 ring-white/[0.06]">
                <button
                  type="button"
                  id={headerId}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenId((prev) => (prev === row.id ? null : row.id))}
                  className="flex w-full items-center justify-between gap-[1.125rem] px-6 py-5 text-left transition hover:bg-white/[0.03] sm:px-[1.875rem] sm:py-6"
                >
                  <span className="min-w-0 flex-1 text-[22px] font-bold leading-snug text-white">
                    {row.question}
                  </span>
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-zinc-200 transition ${
                      open
                        ? "border-zinc-500 bg-zinc-800/90"
                        : "border-zinc-600 bg-zinc-900/80 hover:border-zinc-500"
                    }`}
                    aria-hidden
                  >
                    <PlusMinusIcon open={open} />
                  </span>
                </button>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="border-t border-white/[0.06] bg-black/25 px-6 pb-6 pt-4 sm:px-[1.875rem] sm:pb-[1.875rem] sm:pt-5">
                      <p className="whitespace-pre-wrap text-base leading-relaxed text-zinc-400 sm:text-[17px] sm:leading-relaxed">
                        {renderPartnerFaqAnswerBody(row.answer, row.id)}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-12 text-center text-sm text-zinc-600 sm:text-[15px]">
        Нужна персональная помощь?{" "}
        <Link
          href="/support"
          className="font-medium text-cb-flame/95 underline-offset-[3px] hover:underline"
        >
          Центр поддержки
        </Link>
      </p>
      {showLevels ? <style jsx>{`
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
      `}</style> : null}
    </div>
  );
}
