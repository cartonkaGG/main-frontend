"use client";

import Image from "next/image";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

export type RouletteItem = {
  name: string;
  rarity: string;
  sellPrice: number;
  image: string;
};

const CARD_STEP = 136;
const HALF_CARD = 64;
const TRACK_PAD = 16;
const REPEAT = 48;
const SPIN_ROUNDS = 26;

const rarityBar: Record<string, string> = {
  common: "bg-zinc-500",
  uncommon: "bg-emerald-500",
  rare: "bg-blue-500",
  epic: "bg-fuchsia-500",
  legendary: "bg-amber-400",
};

function RouletteCard({ item }: { item: RouletteItem }) {
  const bar = rarityBar[item.rarity] || rarityBar.common;
  return (
    <div className="relative h-[7.75rem] w-32 shrink-0 overflow-hidden rounded-xl border border-cb-stroke/80 bg-[#0c1018]/95 shadow-inner">
      <div className="relative h-[calc(100%-4px)] w-full p-1.5">
        <div className="relative mx-auto h-[4.75rem] w-full">
          {item.image ? (
            <Image
              src={item.image}
              alt=""
              fill
              className="object-contain drop-shadow-md"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl text-zinc-700">?</div>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-center text-[10px] font-medium leading-tight text-zinc-200">
          {item.name}
        </p>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${bar}`} />
    </div>
  );
}

type Props = {
  items: RouletteItem[];
  spinWaiting: boolean;
  landOnIndex: number | null;
  landEpoch: number;
  onLandComplete: () => void;
};

export function CaseRoulette({
  items,
  spinWaiting,
  landOnIndex,
  landEpoch,
  onLandComplete,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [tx, setTx] = useState(0);
  const [transitionMs, setTransitionMs] = useState(0);
  const landedRef = useRef(false);

  const strip = useMemo(() => {
    if (!items.length) return [];
    const len = Math.max(items.length * REPEAT, items.length * (SPIN_ROUNDS + 4));
    return Array.from({ length: len }, (_, i) => ({
      ...items[i % items.length],
      key: i,
    }));
  }, [items]);

  useLayoutEffect(() => {
    if (!viewportRef.current || !items.length) return;

    if (spinWaiting) {
      setTransitionMs(0);
      setTx(0);
      return;
    }

    if (landOnIndex == null) {
      const vw = viewportRef.current.clientWidth;
      const idleIdx = items.length * 3;
      setTransitionMs(0);
      setTx(vw / 2 - HALF_CARD - TRACK_PAD - idleIdx * CARD_STEP);
      landedRef.current = false;
      return;
    }

    if (landEpoch === 0) {
      return;
    }

    landedRef.current = false;

    const vw = viewportRef.current.clientWidth;
    const n = items.length;
    const finalSlot = SPIN_ROUNDS * n + landOnIndex;
    const endTx = vw / 2 - HALF_CARD - TRACK_PAD - finalSlot * CARD_STEP;
    const startTx = endTx + 2600;

    setTransitionMs(0);
    setTx(startTx);

    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTransitionMs(4800);
        setTx(endTx);
      });
    });

    return () => cancelAnimationFrame(id);
  }, [items, spinWaiting, landOnIndex, landEpoch]);

  function onTransitionEnd(e: React.TransitionEvent) {
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

  const useWaitMotion = spinWaiting && landOnIndex === null;

  return (
    <div className="relative w-full">
      <div
        ref={viewportRef}
        className="relative h-[10.5rem] overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#05080f]/95 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] sm:h-[12rem]"
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-[7.25rem] -translate-x-1/2 sm:w-[8rem]"
          aria-hidden
        >
          <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border border-cyan-400/60 bg-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
          <div className="absolute inset-y-1 rounded-full border-2 border-cyan-400/70 shadow-[0_0_24px_rgba(34,211,238,0.35)]" />
        </div>

        <div
          className={`flex h-full items-center gap-2 pl-4 pr-32 will-change-transform ${
            useWaitMotion ? "animate-case-roulette-wait" : ""
          }`}
          style={
            useWaitMotion
              ? undefined
              : {
                  transform: `translate3d(${tx}px,0,0)`,
                  transition:
                    transitionMs > 0
                      ? `transform ${transitionMs}ms cubic-bezier(0.06, 0.75, 0.2, 1)`
                      : "none",
                }
          }
          onTransitionEnd={onTransitionEnd}
        >
          {strip.map((it) => (
            <RouletteCard key={it.key} item={it} />
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
