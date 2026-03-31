"use client";

import Image from "next/image";
import { normRarity, rarityBar, rarityCardFill } from "@/components/CaseRoulette";
import type { LiveDrop } from "@/hooks/useLiveDrops";

function splitItemDisplay(item: string): { weapon: string; skin: string } {
  const t = item.trim();
  const idx = t.indexOf("|");
  if (idx === -1) return { weapon: t, skin: "" };
  return {
    weapon: t.slice(0, idx).trim(),
    skin: t.slice(idx + 1).trim(),
  };
}

/** Портретная карточка: изображение ~верхние 60%, текст по центру внизу; тонкий разделитель между карточками */
function DropRow({ d }: { d: LiveDrop }) {
  const rk = normRarity(d.rarity);
  const bar = rarityBar[rk] || rarityBar.common;
  const fill = rarityCardFill[rk] || rarityCardFill.common;
  const { weapon, skin } = splitItemDisplay(d.item);
  const fromUpgrade = d.source === "upgrade";

  return (
    <div
      className={`flex min-h-[7.75rem] overflow-hidden border-b border-black/45 last:border-b-0 sm:min-h-[8.25rem] ${fill}`}
    >
      <div
        className={`w-1 shrink-0 self-stretch shadow-[2px_0_10px_rgba(0,0,0,0.35)] sm:w-1 ${bar}`}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col items-center px-2 pb-2 pt-2.5 sm:px-2.5 sm:pb-2.5 sm:pt-3">
        <div className="relative min-h-[4rem] w-full max-w-[5.5rem] flex-1 sm:min-h-[4.5rem] sm:max-w-[6rem]">
          {d.image ? (
            <Image
              src={d.image}
              alt=""
              fill
              className="object-contain object-center drop-shadow-[0_4px_14px_rgba(0,0,0,0.45)]"
              sizes="96px"
              unoptimized
            />
          ) : (
            <div className="flex h-full min-h-[3.5rem] items-center justify-center text-[10px] font-bold text-zinc-400">
              CS
            </div>
          )}
        </div>
        <div className="mt-auto w-full space-y-0.5 pt-1 text-center">
          {fromUpgrade ? (
            <p className="mb-1 text-[8px] font-black uppercase tracking-[0.14em] text-cb-flame/95">
              Выпало в апгрейде
            </p>
          ) : null}
          <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] sm:text-[11px]">
            {weapon || d.item}
          </p>
          {skin ? (
            <p className="line-clamp-2 text-[9px] font-medium leading-snug text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-[10px]">
              {skin}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type Props = { drops: LiveDrop[]; children: React.ReactNode };

export function LiveDropsRail({ drops, children }: Props) {
  const loop = drops.length > 0 ? [...drops, ...drops] : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:h-full lg:min-h-0 lg:flex-row">
      <aside className="relative hidden h-auto min-h-0 w-[min(13rem,100%)] shrink-0 flex-col border-r border-cb-stroke/80 bg-[#06060c]/95 lg:flex lg:h-full lg:min-h-0">
        <div className="min-h-0 flex-1 overflow-hidden px-1.5 py-1.5 sm:px-2 sm:py-2">
          {drops.length === 0 ? (
            <p className="p-3 text-center text-[11px] leading-relaxed text-zinc-500">
              Пока нет дропов из кейсов и апгрейдов. Откройте кейс или выиграйте апгрейд — запись появится здесь в реальном времени.
            </p>
          ) : (
            <div className="flex flex-col overflow-hidden rounded-lg ring-1 ring-black/30">
              {drops.map((d) => (
                <DropRow key={d.id} d={d} />
              ))}
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative shrink-0 overflow-hidden border-b border-cb-stroke/80 bg-[#06060c]/85 py-2 backdrop-blur-md lg:hidden">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-10 bg-gradient-to-r from-[#020204] to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-10 bg-gradient-to-l from-[#020204] to-transparent" />
          {drops.length === 0 ? (
            <p className="px-4 text-center text-[11px] text-zinc-500">
              Лента пуста — откройте кейс или выиграйте апгрейд.
            </p>
          ) : (
            <div className="flex overflow-hidden px-3">
              <div className="flex min-w-max animate-marquee gap-8 pr-8">
                {loop.map((d, i) => {
                  const { weapon, skin } = splitItemDisplay(d.item);
                  const label = skin ? `${weapon} — ${skin}` : d.item;
                  const fromUpgrade = d.source === "upgrade";
                  return (
                    <div
                      key={`${d.id}-${i}`}
                      className="flex items-center gap-2 whitespace-nowrap text-xs"
                    >
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${rarityBar[normRarity(d.rarity)] || rarityBar.common}`}
                      />
                      <span className="font-semibold text-cb-flame">{d.user}</span>
                      <span className="text-zinc-600">→</span>
                      <span className="text-zinc-200">{label}</span>
                      {fromUpgrade ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-cb-flame/90">
                          · апгрейд
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <main className="min-h-0 flex-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-y-contain">
          {children}
        </main>
      </div>
    </div>
  );
}
