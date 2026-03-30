"use client";

import Image from "next/image";
import type { LiveDrop } from "@/hooks/useLiveDrops";

const RARITY_BAR: Record<string, string> = {
  common: "bg-zinc-500",
  uncommon: "bg-emerald-500",
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-cb-flame shadow-[0_0_10px_rgba(255,49,49,0.7)]",
};

function DropRow({ d }: { d: LiveDrop }) {
  const bar = RARITY_BAR[d.rarity] || RARITY_BAR.common;
  return (
    <div className="flex gap-2 border-b border-cb-stroke/60 px-3 py-2.5 transition hover:bg-white/[0.03]">
      <div className={`mt-0.5 w-1 shrink-0 self-stretch rounded-full ${bar}`} />
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-black/40">
        {d.image ? (
          <Image src={d.image} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">CS</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-cb-flame">{d.user}</p>
        <p className="truncate text-[11px] leading-tight text-zinc-300">{d.item}</p>
        {d.caseName ? (
          <p className="truncate text-[10px] text-zinc-600">{d.caseName}</p>
        ) : null}
      </div>
    </div>
  );
}

type Props = { drops: LiveDrop[]; children: React.ReactNode };

export function LiveDropsRail({ drops, children }: Props) {
  const loop = drops.length > 0 ? [...drops, ...drops] : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="relative hidden h-auto min-h-0 w-[min(18rem,100%)] shrink-0 flex-col border-r border-cb-stroke/80 bg-gradient-to-b from-[#06060c]/95 to-[#020204] lg:flex lg:h-[calc(100dvh-52px)] lg:sticky lg:top-[52px] lg:self-start">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-1">
          {drops.length === 0 ? (
            <p className="p-4 text-center text-xs leading-relaxed text-zinc-500">
              Пока никто не открыл кейс. Откройте свой — дроп появится здесь в реальном времени.
            </p>
          ) : (
            drops.map((d) => <DropRow key={d.id} d={d} />)
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative shrink-0 overflow-hidden border-b border-cb-stroke/80 bg-[#06060c]/85 py-2 backdrop-blur-md lg:hidden">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-10 bg-gradient-to-r from-[#020204] to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-10 bg-gradient-to-l from-[#020204] to-transparent" />
          {drops.length === 0 ? (
            <p className="px-4 text-center text-[11px] text-zinc-500">
              Лента пуста — откройте кейс.
            </p>
          ) : (
            <div className="flex overflow-hidden px-3">
              <div className="flex min-w-max animate-marquee gap-8 pr-8">
                {loop.map((d, i) => (
                  <div
                    key={`${d.id}-${i}`}
                    className="flex items-center gap-2 whitespace-nowrap text-xs"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${RARITY_BAR[d.rarity] || RARITY_BAR.common}`}
                    />
                    <span className="font-semibold text-cb-flame">{d.user}</span>
                    <span className="text-zinc-600">→</span>
                    <span className="text-zinc-200">{d.item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
