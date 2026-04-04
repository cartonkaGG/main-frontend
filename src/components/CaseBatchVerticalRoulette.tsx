"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { preferHighResSteamEconomyImage, SKIN_IMG_QUALITY_CLASS } from "@/lib/steamImage";
import {
  getRouletteSoundMuted,
  setRouletteSoundMuted,
  startRouletteSpinTicks,
} from "@/lib/rouletteSound";
import {
  normRarity,
  rarityBar,
  rarityCardFill,
  BATCH_VERTICAL_SPIN_ROUNDS,
  rouletteStripHeadSlots,
  rouletteStripSlotCount,
  type RouletteItem,
} from "@/components/CaseRoulette";

/** Висота картки + gap між картками (px), має збігатися з h-[…rem] + gap у стрічці */
const CARD_STEP_Y = 164;
const HALF_CARD_Y = 76;
const TRACK_PAD = 8;
/** Відступ зверху як у pt-2.5 — має збігатися з позиціонуванням віртуального ряду */
const STRIP_PAD_TOP = 10;
/** Скільки карток рендерити зверху й знизу від видимої зони (решта — spacer) */
const VIRTUAL_BUFFER = 5;

/** Однакова тривалість прокрутки всіх колонок батча (мс), ціль 5–6 с. */
const BATCH_VERTICAL_SPIN_DURATION_MS = 6000;

/** Ease-out близько до cubic-bezier(0.22, 0.82, 0.12, 1) — ручний rAF замість CSS transition. */
function batchSpinEase(u: number) {
  const inv = 1 - Math.min(1, Math.max(0, u));
  return 1 - inv * inv * inv * inv;
}

/** Детермінований RNG для стабільної перестановки між рендерами. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Унікальний порядок скінів у кільці для кожної колонки (x2–x5), щоб рулетки не були синхронні.
 * perm[r] = індекс предмета в `items` на візуальній позиції r mod n.
 */
function columnRingPermutation(n: number, columnIndex: number): number[] {
  if (n <= 0) return [];
  const perm = Array.from({ length: n }, (_, i) => i);
  const seed =
    (((columnIndex + 1) * 1_000_003) ^ (n * 524_287) ^ ((columnIndex * 17 + n * 31) << 8)) >>> 0;
  const rnd = mulberry32(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = perm[i]!;
    perm[i] = perm[j]!;
    perm[j] = t;
  }
  return perm;
}

function invertPermutation(perm: number[]): number[] {
  const inv = new Array<number>(perm.length);
  for (let r = 0; r < perm.length; r++) {
    inv[perm[r]!] = r;
  }
  return inv;
}

/** Індекс у каталозі `items` з API; clamp, щоб `inv[i]` не ламався. */
function clampCatalogLandIndex(landOnIndex: number | null, n: number): number | null {
  if (landOnIndex == null || n <= 0) return null;
  const j = Math.trunc(Number(landOnIndex));
  if (!Number.isFinite(j)) return null;
  return Math.max(0, Math.min(n - 1, j));
}

function batchStripYForSlot(vh: number, slotIndex: number) {
  return vh / 2 - HALF_CARD_Y - TRACK_PAD - STRIP_PAD_TOP - slotIndex * CARD_STEP_Y;
}

/** Ті самі idle/end, що й у колонці (для централізованого rAF у батька). */
function computeBatchColumnEnds(
  items: RouletteItem[],
  columnIndex: number,
  landOnIndex: number | null,
  vh: number,
): { idleTy: number; endTy: number } {
  const n = items.length;
  if (n <= 0 || vh < 1) return { idleTy: 0, endTy: 0 };
  const perm = columnRingPermutation(n, columnIndex);
  const inv = invertPermutation(perm);
  const head = rouletteStripHeadSlots(n);
  const idleIdx = n * BATCH_VERTICAL_SPIN_ROUNDS + head;
  const idleTy = batchStripYForSlot(vh, idleIdx);
  const cat = clampCatalogLandIndex(landOnIndex, n);
  if (cat == null) return { idleTy, endTy: idleTy };
  const ringLand = inv[cat] ?? 0;
  const finalSlot = BATCH_VERTICAL_SPIN_ROUNDS * n + ringLand + head;
  const endTy = batchStripYForSlot(vh, finalSlot);
  return { idleTy, endTy };
}

const BatchVerticalCard = memo(function BatchVerticalCard({
  item,
  isWinner,
}: {
  item: RouletteItem;
  isWinner?: boolean;
}) {
  const rk = normRarity(item.rarity);
  const bar = rarityBar[rk] || rarityBar.common;
  const fill = rarityCardFill[rk] || rarityCardFill.common;
  return (
    <div
      className={`relative h-[9.5rem] w-full max-w-[118px] shrink-0 overflow-hidden rounded-xl border border-cb-stroke/70 sm:max-w-[132px] ${fill} ${
        isWinner
          ? "z-10 scale-[1.04] ring-2 ring-orange-400/50 will-change-transform transition-transform duration-200 ease-out"
          : "z-0 scale-100"
      }`}
    >
      <div className="relative z-[1] flex h-full min-h-0 flex-col p-1.5 pb-1">
        <div className="relative mx-auto min-h-0 flex-1 basis-0 w-full">
          {item.image ? (
            // Навмисно <img>: у батчі ×5 сотні Next/Image сильно гальмують рулетку.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preferHighResSteamEconomyImage(item.image) ?? item.image}
              alt=""
              draggable={false}
              decoding="async"
              className={`absolute inset-0 m-auto max-h-full max-w-full object-contain ${SKIN_IMG_QUALITY_CLASS}`}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl text-zinc-300/80">?</div>
          )}
        </div>
        <div className="mt-1 min-h-0 text-center">
          <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-[11px]">
            {item.name}
          </p>
          {item.exterior ? (
            <p className="mt-0.5 line-clamp-1 text-[8px] font-medium capitalize leading-tight text-zinc-400 sm:text-[9px]">
              {item.exterior}
            </p>
          ) : null}
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 z-[2] h-1.5 ${bar}`} />
    </div>
  );
});

function VerticalColumn({
  items,
  columnIndex,
  spinWaiting,
  landOnIndex,
  drivenStripY,
  accentWinner,
}: {
  items: RouletteItem[];
  columnIndex: number;
  spinWaiting: boolean;
  landOnIndex: number | null;
  /** Позиція стрічки з батька (один rAF на всі колонки); якщо undefined — локальний ty. */
  drivenStripY?: number;
  accentWinner: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [ty, setTy] = useState(0);

  const n = items.length;
  const landCatalogIdx = useMemo(
    () => clampCatalogLandIndex(landOnIndex, n),
    [landOnIndex, n],
  );

  const { perm, inv } = useMemo(() => {
    if (n <= 0) return { perm: [] as number[], inv: [] as number[] };
    const p = columnRingPermutation(n, columnIndex);
    return { perm: p, inv: invertPermutation(p) };
  }, [n, columnIndex]);

  const stripLen =
    n > 0 && perm.length > 0
      ? rouletteStripSlotCount(n, BATCH_VERTICAL_SPIN_ROUNDS)
      : 0;

  const head = n > 0 ? rouletteStripHeadSlots(n) : 0;

  const [slotLo, slotHi] = useMemo(() => {
    if (stripLen <= 0 || n <= 0) return [0, -1] as const;
    const idleIdx = n * BATCH_VERTICAL_SPIN_ROUNDS + head;
    if (spinWaiting || landCatalogIdx == null || !inv.length) {
      return [
        Math.max(0, idleIdx - VIRTUAL_BUFFER),
        Math.min(stripLen - 1, idleIdx + VIRTUAL_BUFFER),
      ] as const;
    }
    const ringLand = inv[landCatalogIdx] ?? 0;
    const finalSlot = BATCH_VERTICAL_SPIN_ROUNDS * n + ringLand + head;
    const lo = Math.max(0, Math.min(idleIdx, finalSlot) - VIRTUAL_BUFFER);
    const hi = Math.min(stripLen - 1, Math.max(idleIdx, finalSlot) + VIRTUAL_BUFFER);
    return [lo, hi] as const;
  }, [stripLen, n, head, spinWaiting, landCatalogIdx, inv]);

  const stripMinHeight = STRIP_PAD_TOP + Math.max(0, stripLen) * CARD_STEP_Y + 96;

  useLayoutEffect(() => {
    if (!viewportRef.current || n <= 0) return;

    let cancelled = false;
    let rafRetry: number | null = null;

    function measureVh(cb: (vh: number) => void) {
      const tick = () => {
        if (cancelled) return;
        const vh = viewportRef.current?.clientHeight ?? 0;
        if (vh < 1) {
          rafRetry = requestAnimationFrame(tick);
          return;
        }
        rafRetry = requestAnimationFrame(() => {
          if (cancelled) return;
          const vh2 = viewportRef.current?.clientHeight ?? vh;
          cb(vh2 > 0 ? vh2 : vh);
        });
      };
      tick();
    }

    const idleIdx = n * BATCH_VERTICAL_SPIN_ROUNDS + head;

    if (spinWaiting) {
      measureVh((vh) => {
        if (cancelled) return;
        setTy(batchStripYForSlot(vh, idleIdx));
      });
      return () => {
        cancelled = true;
        if (rafRetry != null) cancelAnimationFrame(rafRetry);
      };
    }

    if (landCatalogIdx == null || !inv.length) {
      measureVh((vh) => {
        if (cancelled) return;
        setTy(batchStripYForSlot(vh, idleIdx));
      });
      return () => {
        cancelled = true;
        if (rafRetry != null) cancelAnimationFrame(rafRetry);
      };
    }

    // Під час спіну позицію задає батько (drivenStripY); лише скасовуємо відкладене вимірювання.
    return () => {
      cancelled = true;
      if (rafRetry != null) cancelAnimationFrame(rafRetry);
    };
  }, [n, head, spinWaiting, landCatalogIdx, inv.length]);

  const stripTranslateY = typeof drivenStripY === "number" ? drivenStripY : ty;

  const ringLandWin =
    landCatalogIdx != null && inv.length > 0 ? (inv[landCatalogIdx] ?? 0) : 0;
  const winnerStripIndex =
    landCatalogIdx != null && n > 0 && inv.length > 0
      ? BATCH_VERTICAL_SPIN_ROUNDS * n + ringLandWin + head
      : -1;

  return (
    <div
      ref={viewportRef}
      className="relative h-[16rem] w-[124px] shrink-0 overflow-hidden rounded-xl border border-cb-stroke/50 bg-[#05080f]/95 shadow-[inset_0_0_32px_rgba(0,0,0,0.45)] sm:h-[18rem] sm:w-[148px] sm:shrink-0"
    >
      <div
        ref={stripRef}
        className="will-change-transform [backface-visibility:hidden] [transform:translateZ(0)]"
        style={{
          transform: `translate3d(0,${stripTranslateY}px,0)`,
          transition: "none",
        }}
      >
        <div className="relative mx-auto w-full px-1.5" style={{ minHeight: stripMinHeight }}>
          {slotHi >= slotLo &&
            Array.from({ length: slotHi - slotLo + 1 }, (_, k) => {
              const i = slotLo + k;
              const catIdx = perm[i % n] ?? 0;
              const it = items[catIdx];
              if (!it) return null;
              return (
                <div
                  key={i}
                  className="absolute left-1/2 w-[calc(100%-0.75rem)] max-w-[132px] -translate-x-1/2"
                  style={{ top: STRIP_PAD_TOP + i * CARD_STEP_Y }}
                >
                  <BatchVerticalCard
                    item={it}
                    isWinner={accentWinner && i === winnerStripIndex}
                  />
                </div>
              );
            })}
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-0 -translate-y-1/2"
        aria-hidden
      >
        <div className="absolute -left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 border-y-[8px] border-l-[11px] border-y-transparent border-l-orange-400/90 drop-shadow-[0_0_14px_rgba(249,115,22,0.65)] sm:h-[1.125rem] sm:w-[1.125rem] sm:border-y-[9px] sm:border-l-[12px]" />
        <div className="absolute -right-0.5 top-1/2 h-4 w-4 -translate-y-1/2 border-y-[8px] border-r-[11px] border-y-transparent border-r-orange-400/90 drop-shadow-[0_0_14px_rgba(249,115,22,0.65)] sm:h-[1.125rem] sm:w-[1.125rem] sm:border-y-[9px] sm:border-r-[12px]" />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[#05080f] to-transparent sm:h-16"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#05080f] to-transparent sm:h-16"
        aria-hidden
      />
    </div>
  );
}

type Props = {
  items: RouletteItem[];
  columnCount: number;
  spinWaiting: boolean;
  landIndices: number[] | null;
  landEpoch: number;
  onLandComplete: () => void;
  accentWinner?: boolean;
};

export function CaseBatchVerticalRoulette({
  items,
  columnCount,
  spinWaiting,
  landIndices,
  landEpoch,
  onLandComplete,
  accentWinner = false,
}: Props) {
  const [soundMuted, setSoundMuted] = useState(false);
  const batchVhMeasureRef = useRef<HTMLDivElement>(null);
  const [unifiedStripYs, setUnifiedStripYs] = useState<number[] | null>(null);
  const landCompleteFiredRef = useRef(false);
  const onLandCompleteRef = useRef(onLandComplete);
  onLandCompleteRef.current = onLandComplete;

  const safeCount = Math.max(2, Math.min(5, columnCount));
  const indices =
    landIndices && landIndices.length >= safeCount
      ? landIndices.slice(0, safeCount)
      : landIndices;

  const landLen = landIndices?.length ?? 0;
  const indicesKey =
    landIndices && landIndices.length >= safeCount
      ? landIndices.slice(0, safeCount).join(",")
      : "";

  useLayoutEffect(() => {
    let rafId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    function clearSpin() {
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = null;
      if (timeoutId != null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }

    if (
      spinWaiting ||
      landEpoch < 1 ||
      landLen < safeCount ||
      !landIndices?.length ||
      indicesKey === ""
    ) {
      clearSpin();
      setUnifiedStripYs(null);
      landCompleteFiredRef.current = false;
      return () => {
        cancelled = true;
        clearSpin();
      };
    }

    const slice = landIndices.slice(0, safeCount);
    const vh = batchVhMeasureRef.current?.clientHeight ?? 256;

    const from: number[] = [];
    const to: number[] = [];
    let anyMove = false;
    for (let i = 0; i < safeCount; i++) {
      const { idleTy, endTy } = computeBatchColumnEnds(items, i, slice[i] ?? null, vh);
      from.push(idleTy);
      to.push(endTy);
      if (Math.abs(endTy - idleTy) >= 0.5) anyMove = true;
    }

    landCompleteFiredRef.current = false;
    setUnifiedStripYs(from);

    const D = BATCH_VERTICAL_SPIN_DURATION_MS;

    function fireComplete() {
      if (landCompleteFiredRef.current || cancelled) return;
      landCompleteFiredRef.current = true;
      clearSpin();
      setUnifiedStripYs([...to]);
      queueMicrotask(() => {
        onLandCompleteRef.current();
      });
    }

    if (!anyMove) {
      queueMicrotask(() => {
        if (!cancelled) fireComplete();
      });
      return () => {
        cancelled = true;
        clearSpin();
      };
    }

    const t0 = performance.now();
    timeoutId = setTimeout(() => {
      if (cancelled) return;
      fireComplete();
    }, D + 900);

    function tick(now: number) {
      if (cancelled || landCompleteFiredRef.current) return;
      const u = Math.min(1, (now - t0) / D);
      const ys = from.map((f, i) => f + (to[i]! - f) * batchSpinEase(u));
      setUnifiedStripYs(ys);
      if (u < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        fireComplete();
      }
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      clearSpin();
    };
  }, [spinWaiting, landEpoch, landLen, safeCount, indicesKey, items, landIndices]);

  useEffect(() => {
    setSoundMuted(getRouletteSoundMuted());
  }, []);

  useEffect(() => {
    if (soundMuted || spinWaiting || !landIndices?.length || landEpoch === 0) return;
    return startRouletteSpinTicks(BATCH_VERTICAL_SPIN_DURATION_MS, false);
  }, [landEpoch, landIndices, soundMuted, spinWaiting]);

  if (!items.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-cb-stroke/60 bg-black/30 text-sm text-zinc-500">
        В кейсе нет предметов
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-6xl">
      <div
        ref={batchVhMeasureRef}
        className="pointer-events-none absolute left-0 top-0 -z-10 box-border h-[16rem] w-px overflow-hidden border border-cb-stroke/50 opacity-0 sm:h-[18rem]"
        aria-hidden
      />
      <button
        type="button"
        onClick={() => {
          const next = !soundMuted;
          setSoundMuted(next);
          setRouletteSoundMuted(next);
        }}
        className="absolute -right-1 -top-11 z-30 flex items-center gap-1.5 rounded-lg border border-cb-stroke/70 bg-[#0a0e14]/90 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 shadow-md transition hover:border-zinc-600 hover:text-zinc-200 sm:-top-[3.25rem] sm:text-xs"
        title={soundMuted ? "Включить звук рулетки" : "Выключить звук рулетки"}
        aria-pressed={!soundMuted}
      >
        <span className="text-base leading-none" aria-hidden>
          {soundMuted ? "🔇" : "🔊"}
        </span>
        <span className="hidden sm:inline">{soundMuted ? "Звук выкл." : "Звук вкл."}</span>
      </button>

      <div className="flex w-full flex-nowrap justify-start gap-2 overflow-x-auto overflow-y-visible pb-1 [-webkit-overflow-scrolling:touch] sm:justify-center sm:gap-4 sm:overflow-x-visible sm:pb-0">
        {Array.from({ length: safeCount }, (_, i) => (
          <VerticalColumn
            key={i}
            columnIndex={i}
            items={items}
            spinWaiting={spinWaiting}
            landOnIndex={indices?.[i] ?? null}
            drivenStripY={unifiedStripYs?.[i]}
            accentWinner={accentWinner}
          />
        ))}
      </div>
    </div>
  );
}
