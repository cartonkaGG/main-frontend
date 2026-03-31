"use client";

import Image from "next/image";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  getRouletteSoundMuted,
  setRouletteSoundMuted,
  startRouletteSpinTicks,
} from "@/lib/rouletteSound";
import {
  normRarity,
  rarityBar,
  rarityCardFill,
  ROULETTE_SPIN_DURATION_MS,
  ROULETTE_SPIN_EASE,
  rouletteStripHeadSlots,
  rouletteStripSlotCount,
  type RouletteItem,
} from "@/components/CaseRoulette";

/** Висота картки + gap між картками (px), має збігатися з h-[…rem] + gap у стрічці */
const CARD_STEP_Y = 164;
const HALF_CARD_Y = 76;
const TRACK_PAD = 8;
const SPIN_ROUNDS = 26;
const START_OFFSET_Y = Math.round((2400 * ROULETTE_SPIN_DURATION_MS) / 4800);

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
      className={`relative h-[9.5rem] w-full max-w-[118px] shrink-0 overflow-hidden rounded-xl border border-cb-stroke/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-transform duration-500 ease-out sm:max-w-[132px] ${fill} ${
        isWinner ? "z-10 scale-[1.05] shadow-[0_0_26px_rgba(255,49,49,0.35)] will-change-transform" : "z-0 scale-100"
      }`}
    >
      <div className="relative z-[1] flex h-full min-h-0 flex-col p-1.5 pb-1">
        <div className="relative mx-auto min-h-0 flex-1 basis-0 w-full">
          {item.image ? (
            <Image
              src={item.image}
              alt=""
              fill
              className="object-contain drop-shadow-md"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl text-zinc-300/80">?</div>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-center text-[10px] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-[11px]">
          {item.name}
        </p>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 z-[2] h-1.5 ${bar}`} />
    </div>
  );
});

function VerticalColumn({
  items,
  spinWaiting,
  landOnIndex,
  landEpoch,
  accentWinner,
  onStripTransitionEnd,
}: {
  items: RouletteItem[];
  spinWaiting: boolean;
  landOnIndex: number | null;
  landEpoch: number;
  accentWinner: boolean;
  onStripTransitionEnd: () => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [ty, setTy] = useState(0);
  const [transitionMs, setTransitionMs] = useState(0);
  const landedRef = useRef(false);

  const strip = useMemo(() => {
    if (!items.length) return [];
    const len = rouletteStripSlotCount(items.length);
    return Array.from({ length: len }, (_, i) => ({
      ...items[i % items.length],
      key: i,
    }));
  }, [items]);

  useLayoutEffect(() => {
    if (!viewportRef.current || !items.length) return;

    const n = items.length;
    const head = rouletteStripHeadSlots(n);

    if (spinWaiting) {
      const vh = viewportRef.current.clientHeight;
      const idleIdx = n * 3 + head;
      setTransitionMs(0);
      setTy(vh / 2 - HALF_CARD_Y - TRACK_PAD - idleIdx * CARD_STEP_Y);
      return;
    }

    if (landOnIndex == null) {
      const vh = viewportRef.current.clientHeight;
      const idleIdx = n * 3 + head;
      setTransitionMs(0);
      setTy(vh / 2 - HALF_CARD_Y - TRACK_PAD - idleIdx * CARD_STEP_Y);
      landedRef.current = false;
      return;
    }

    landedRef.current = false;

    const vh = viewportRef.current.clientHeight;
    const finalSlot = SPIN_ROUNDS * n + landOnIndex + head;
    const endTy = vh / 2 - HALF_CARD_Y - TRACK_PAD - finalSlot * CARD_STEP_Y;
    const startTy = endTy + START_OFFSET_Y;

    setTransitionMs(0);
    setTy(startTy);

    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTransitionMs(ROULETTE_SPIN_DURATION_MS);
        setTy(endTy);
      });
    });

    return () => cancelAnimationFrame(id);
  }, [items, spinWaiting, landOnIndex, landEpoch]);

  function onTransitionEnd(e: React.TransitionEvent) {
    if (e.propertyName !== "transform" || transitionMs === 0) return;
    if (landOnIndex == null || landedRef.current) return;
    landedRef.current = true;
    onStripTransitionEnd();
  }

  const n = items.length;
  const headSlots = rouletteStripHeadSlots(n);
  const winnerStripIndex =
    landOnIndex != null && n > 0 ? SPIN_ROUNDS * n + landOnIndex + headSlots : -1;

  return (
    <div
      ref={viewportRef}
      className="relative h-[16rem] min-w-0 flex-1 overflow-hidden rounded-xl border border-cb-stroke/50 bg-[#05080f]/95 shadow-[inset_0_0_32px_rgba(0,0,0,0.45)] sm:h-[18rem] sm:max-w-[148px] sm:flex-none"
    >
      <div
        className="flex flex-col items-center gap-3 px-1.5 pb-28 pt-2.5 will-change-transform"
        style={{
          transform: `translate3d(0,${ty}px,0)`,
          transition:
            transitionMs > 0
              ? `transform ${transitionMs}ms ${ROULETTE_SPIN_EASE}`
              : "none",
        }}
        onTransitionEnd={onTransitionEnd}
      >
        {strip.map((it) => (
          <BatchVerticalCard
            key={it.key}
            item={it}
            isWinner={accentWinner && it.key === winnerStripIndex}
          />
        ))}
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
  const endedRef = useRef(0);
  const completionFiredRef = useRef(false);

  useEffect(() => {
    setSoundMuted(getRouletteSoundMuted());
  }, []);

  useEffect(() => {
    if (soundMuted || spinWaiting || !landIndices?.length || landEpoch === 0) return;
    return startRouletteSpinTicks(ROULETTE_SPIN_DURATION_MS, false);
  }, [landEpoch, landIndices, soundMuted, spinWaiting]);

  useEffect(() => {
    endedRef.current = 0;
    completionFiredRef.current = false;
  }, [landIndices, landEpoch, spinWaiting, columnCount]);

  const safeCount = Math.max(2, Math.min(5, columnCount));
  const indices =
    landIndices && landIndices.length >= safeCount
      ? landIndices.slice(0, safeCount)
      : landIndices;

  function handleColumnEnd() {
    if (completionFiredRef.current) return;
    endedRef.current += 1;
    if (endedRef.current >= safeCount) {
      completionFiredRef.current = true;
      onLandComplete();
    }
  }

  if (!items.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-cb-stroke/60 bg-black/30 text-sm text-zinc-500">
        В кейсе нет предметов
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-6xl">
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

      <div className="flex w-full justify-center gap-2 sm:gap-4">
        {Array.from({ length: safeCount }, (_, i) => (
          <VerticalColumn
            key={i}
            items={items}
            spinWaiting={spinWaiting}
            landOnIndex={indices?.[i] ?? null}
            landEpoch={landEpoch}
            accentWinner={accentWinner}
            onStripTransitionEnd={handleColumnEnd}
          />
        ))}
      </div>
    </div>
  );
}
