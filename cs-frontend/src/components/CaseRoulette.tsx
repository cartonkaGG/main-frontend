"use client";

import Image from "next/image";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { preferHighResSteamEconomyImage, SKIN_IMG_QUALITY_CLASS } from "@/lib/steamImage";
import {
  getRouletteSoundMuted,
  setRouletteSoundMuted,
  startRouletteSpinTicks,
} from "@/lib/rouletteSound";

export type RouletteItem = {
  name: string;
  rarity: string;
  sellPrice: number;
  image: string;
  /** Якість / wear (з market.csgo hash), напр. field tested */
  exterior?: string;
};

const CARD_STEP = 136;
const HALF_CARD = 64;
const TRACK_PAD = 16;

/**
 * Менше повних циклів = повільніший «потік» карток при тій самій тривалості + менше DOM при x5.
 * Вертикальний батч використовує менше оборотів (`BATCH_VERTICAL_SPIN_ROUNDS`), щоб не лагало ×5.
 */
export const ROULETTE_SPIN_ROUNDS = 11;

/**
 * Менше оборотів у вертикальному батчі (×2–×5 колонок) — менше DOM/Image, та сама тривалість анімації.
 */
export const BATCH_VERTICAL_SPIN_ROUNDS = 3;

/**
 * Раніше стрічка була ~48×N карток (сотні DOM + Image) — сильно лагало.
 * Префікс має бути кратний N: слот i показує items[i % N], тож зсув на H дає той самий скін лише якщо H % N === 0.
 */
const ROULETTE_STRIP_HEAD_MIN = 10;
const ROULETTE_STRIP_TAIL_SLOTS = 8;

/** Кількість «порожніх» слотів на початку стрічки (округлено вгору до кратного N). */
export function rouletteStripHeadSlots(n: number): number {
  if (n <= 0) return 0;
  return Math.ceil(ROULETTE_STRIP_HEAD_MIN / n) * n;
}

export function rouletteStripSlotCount(
  n: number,
  spinRounds: number = ROULETTE_SPIN_ROUNDS,
): number {
  if (n <= 0) return 0;
  return rouletteStripHeadSlots(n) + n * (spinRounds + 1) + ROULETTE_STRIP_TAIL_SLOTS;
}

/** Тривалість основної прокрутки (очікування API — окремо, без анімації стрічки). */
export const ROULETTE_SPIN_DURATION_MS = 5800;
/** Плавніше гальмування ніж (0.06, 0.88, …) — менше «ривка» на старті. */
export const ROULETTE_SPIN_EASE = "cubic-bezier(0.22, 0.82, 0.12, 1)";

export const rarityBar: Record<string, string> = {
  common: "bg-zinc-500",
  uncommon: "bg-sky-400",
  rare: "bg-blue-500",
  epic: "bg-fuchsia-500",
  legendary: "bg-amber-400",
  consumer: "bg-zinc-400",
  industrial: "bg-slate-400",
  milspec: "bg-blue-500",
  "mil-spec": "bg-blue-500",
  restricted: "bg-violet-500",
  classified: "bg-fuchsia-500",
  covert: "bg-red-600",
  extraordinary: "bg-amber-400",
  contraband: "bg-orange-500",
};

/** Фон картки рулетки: градієнт кольору якості → темний низ */
export const rarityCardFill: Record<string, string> = {
  common: "bg-gradient-to-b from-zinc-500/55 via-zinc-700/35 to-zinc-950",
  uncommon: "bg-gradient-to-b from-sky-300/70 via-sky-700/38 to-zinc-950",
  rare: "bg-gradient-to-b from-blue-500/55 via-blue-900/38 to-zinc-950",
  epic: "bg-gradient-to-b from-fuchsia-500/55 via-fuchsia-900/38 to-zinc-950",
  legendary: "bg-gradient-to-b from-amber-400/60 via-amber-800/40 to-zinc-950",
  consumer: "bg-gradient-to-b from-zinc-400/55 via-zinc-700/38 to-zinc-950",
  industrial: "bg-gradient-to-b from-slate-400/55 via-slate-700/38 to-zinc-950",
  milspec: "bg-gradient-to-b from-blue-500/55 via-blue-900/38 to-zinc-950",
  "mil-spec": "bg-gradient-to-b from-blue-500/55 via-blue-900/38 to-zinc-950",
  restricted: "bg-gradient-to-b from-violet-500/55 via-violet-900/38 to-zinc-950",
  classified: "bg-gradient-to-b from-fuchsia-500/55 via-fuchsia-900/38 to-zinc-950",
  covert: "bg-gradient-to-b from-red-500/80 via-red-600/55 to-zinc-950",
  extraordinary: "bg-gradient-to-b from-amber-400/60 via-amber-900/40 to-zinc-950",
  contraband: "bg-gradient-to-b from-orange-500/58 via-orange-900/42 to-zinc-950",
};

export function normRarity(raw: string): string {
  const r = (raw || "common").toLowerCase().trim().replace(/\s+/g, "-");
  if (r === "mil_spec") return "mil-spec";
  return r;
}

const RouletteCard = memo(function RouletteCard({
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
      className={`relative h-[11.25rem] w-32 shrink-0 overflow-hidden rounded-xl border border-cb-stroke/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${fill} ${
        isWinner
          ? "z-10 scale-[1.12] shadow-[0_0_28px_rgba(255,49,49,0.35)] will-change-transform transition-transform duration-200 ease-out sm:scale-[1.14]"
          : "z-0 scale-100"
      }`}
    >
      <div className="relative z-[1] flex h-full min-h-0 flex-col p-1.5 pb-1">
        <div className="relative mx-auto min-h-0 flex-1 basis-0 w-full">
          {item.image ? (
            <Image
              src={preferHighResSteamEconomyImage(item.image) ?? item.image}
              alt=""
              fill
              className={`object-contain drop-shadow-lg ${SKIN_IMG_QUALITY_CLASS}`}
              quality={100}
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl text-zinc-300/80">?</div>
          )}
        </div>
        <div className="mt-1 min-h-0 text-center">
          <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
            {item.name}
          </p>
          {item.exterior ? (
            <p className="mt-0.5 line-clamp-1 text-[8px] font-medium capitalize leading-tight text-zinc-400">
              {item.exterior}
            </p>
          ) : null}
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 z-[2] h-1.5 ${bar}`} />
    </div>
  );
});

type Props = {
  items: RouletteItem[];
  spinWaiting: boolean;
  landOnIndex: number | null;
  landEpoch: number;
  onLandComplete: () => void;
  /** Після зупинки — підсвітити картку під маркером */
  accentWinner?: boolean;
};

export function CaseRoulette({
  items,
  spinWaiting,
  landOnIndex,
  landEpoch,
  onLandComplete,
  accentWinner = false,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [tx, setTx] = useState(0);
  const [transitionMs, setTransitionMs] = useState(0);
  const landedRef = useRef(false);
  const [soundMuted, setSoundMuted] = useState(false);

  useEffect(() => {
    setSoundMuted(getRouletteSoundMuted());
  }, []);

  useEffect(() => {
    if (
      soundMuted ||
      transitionMs !== ROULETTE_SPIN_DURATION_MS ||
      spinWaiting ||
      landOnIndex == null
    ) {
      return;
    }
    return startRouletteSpinTicks(ROULETTE_SPIN_DURATION_MS, false);
  }, [transitionMs, landEpoch, soundMuted, spinWaiting, landOnIndex]);

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

    let cancelled = false;
    let rafRetry: number | null = null;
    let rafSpinOuter: number | null = null;
    let rafSpinInner: number | null = null;
    let attempts = 0;

    const runSpinRaf = (endTx: number) => {
      rafSpinOuter = requestAnimationFrame(() => {
        if (cancelled) return;
        rafSpinInner = requestAnimationFrame(() => {
          if (cancelled) return;
          void viewportRef.current?.offsetWidth;
          setTransitionMs(ROULETTE_SPIN_DURATION_MS);
          setTx(endTx);
        });
      });
    };

    const layout = (vw: number) => {
      if (cancelled) return;
      const n = items.length;
      const head = rouletteStripHeadSlots(n);
      if (spinWaiting) {
        const idleIdx = n * 3 + head;
        setTransitionMs(0);
        setTx(vw / 2 - HALF_CARD - TRACK_PAD - idleIdx * CARD_STEP);
        return;
      }

      if (landOnIndex == null) {
        const idleIdx = n * 3 + head;
        setTransitionMs(0);
        setTx(vw / 2 - HALF_CARD - TRACK_PAD - idleIdx * CARD_STEP);
        landedRef.current = false;
        return;
      }

      landedRef.current = false;

      const idleIdx = n * 3 + head;
      const idleTx = vw / 2 - HALF_CARD - TRACK_PAD - idleIdx * CARD_STEP;
      const finalSlot = ROULETTE_SPIN_ROUNDS * n + landOnIndex + head;
      const endTx = vw / 2 - HALF_CARD - TRACK_PAD - finalSlot * CARD_STEP;

      setTransitionMs(0);
      setTx(idleTx);
      runSpinRaf(endTx);
    };

    const tryLayout = () => {
      if (cancelled) return;
      const vw = viewportRef.current?.clientWidth ?? 0;
      if (vw >= 8) {
        layout(vw);
        return;
      }
      if (attempts++ > 24) {
        const fallback =
          typeof window !== "undefined"
            ? Math.min(520, Math.max(280, Math.floor(window.innerWidth * 0.85)))
            : 400;
        layout(fallback);
        return;
      }
      rafRetry = requestAnimationFrame(tryLayout);
    };

    tryLayout();

    return () => {
      cancelled = true;
      if (rafRetry != null) cancelAnimationFrame(rafRetry);
      if (rafSpinOuter != null) cancelAnimationFrame(rafSpinOuter);
      if (rafSpinInner != null) cancelAnimationFrame(rafSpinInner);
    };
  }, [items, spinWaiting, landOnIndex, landEpoch]);

  function onTransitionEnd(e: React.TransitionEvent) {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "transform" || transitionMs === 0) return;
    if (landOnIndex == null || landedRef.current) return;
    landedRef.current = true;
    onLandComplete();
  }

  if (!items.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-cb-stroke/60 bg-black/30 text-sm text-zinc-500">
        В кейсе нет предметов
      </div>
    );
  }

  const n = items.length;
  const headSlots = rouletteStripHeadSlots(n);
  const winnerStripIndex =
    landOnIndex != null && n > 0 ? ROULETTE_SPIN_ROUNDS * n + landOnIndex + headSlots : -1;

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => {
          const next = !soundMuted;
          setSoundMuted(next);
          setRouletteSoundMuted(next);
        }}
        className="absolute -right-1 -top-10 z-30 flex items-center gap-1.5 rounded-lg border border-cb-stroke/70 bg-[#0a0e14]/90 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 shadow-md transition hover:border-zinc-600 hover:text-zinc-200 sm:-top-11 sm:text-xs"
        title={soundMuted ? "Включить звук рулетки" : "Выключить звук рулетки"}
        aria-pressed={!soundMuted}
      >
        <span className="text-base leading-none" aria-hidden>
          {soundMuted ? "🔇" : "🔊"}
        </span>
        <span className="hidden sm:inline">{soundMuted ? "Звук выкл." : "Звук вкл."}</span>
      </button>

      <div
        ref={viewportRef}
        className="relative h-[12rem] overflow-hidden rounded-2xl border border-cb-stroke/55 bg-[#05080f]/95 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] sm:h-[13.5rem]"
      >
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2"
          aria-hidden
        >
          <div className="h-4 w-4 -translate-y-1/2 rotate-45 border-2 border-orange-400/85 bg-orange-500/35 shadow-[0_0_18px_rgba(249,115,22,0.55)] sm:h-5 sm:w-5 sm:border-[2.5px]" />
        </div>

        <div
          className="flex h-full items-center gap-2 pl-4 pr-32 will-change-transform [backface-visibility:hidden]"
          style={{
            transform: `translate3d(${tx}px,0,0)`,
            transition:
              transitionMs > 0
                ? `transform ${transitionMs}ms ${ROULETTE_SPIN_EASE}`
                : "none",
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {strip.map((it) => (
            <RouletteCard
              key={it.key}
              item={it}
              isWinner={accentWinner && it.key === winnerStripIndex}
            />
          ))}
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#05080f] to-transparent sm:w-24"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#05080f] to-transparent sm:w-24"
          aria-hidden
        />
      </div>
    </div>
  );
}
