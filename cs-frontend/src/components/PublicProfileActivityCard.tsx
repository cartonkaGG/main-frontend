"use client";

import Image from "next/image";
import { RoundedZapIcon } from "@/components/icons/RoundedZapIcon";
import { formatRubSpaced, formatSiteAmountSpaced, SITE_CURRENCY_CODE } from "@/lib/money";
import {
  RARITY_UPGRADE_IMAGE_GLOW,
  rarityCardSurfaceUpgradeGrid,
  resolveUpgradeRarityKey,
} from "@/lib/upgradeGridCardSurface";
import { preferHighResSteamEconomyImage, SKIN_IMG_QUALITY_CLASS } from "@/lib/steamImage";

export type PublicProfileActivity =
  | {
      kind: "case_open";
      at: string;
      itemName: string;
      rarity: string;
      image: string | null;
      caseName: string;
      sellPrice: number;
    }
  | {
      kind: "sell";
      at: string;
      itemName: string;
      rarity: string;
      image: string | null;
      sellPrice: number;
    }
  | {
      kind: "upgrade";
      at: string;
      win: boolean;
      itemName: string;
      rarity: string;
      image: string | null;
      targetPrice: number;
      stakeTotal: number;
    };

const PRICE_TAG_GRID =
  "inline-flex max-w-[min(100%,11.5rem)] items-center gap-0.5 rounded-md border border-emerald-400/45 bg-gradient-to-b from-zinc-900/97 via-zinc-950/98 to-black/92 px-1.5 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_2px_8px_rgba(0,0,0,0.5),0_0_16px_rgba(52,211,153,0.14)] backdrop-blur-sm";
const PRICE_NUM_GRID =
  "whitespace-nowrap font-mono text-[10px] font-bold tabular-nums leading-none tracking-tight text-emerald-100 sm:text-[11px]";

const PRICE_TAG_LOSS =
  "inline-flex max-w-[min(100%,11.5rem)] items-center gap-0.5 rounded-md border border-orange-500/40 bg-gradient-to-b from-zinc-900/95 to-black/90 px-1.5 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_8px_rgba(0,0,0,0.45)] backdrop-blur-sm";
const PRICE_NUM_LOSS = "whitespace-nowrap font-mono text-[9px] font-bold tabular-nums text-orange-200/95 sm:text-[10px]";

function formatWhenShort(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PublicProfileActivityCard({ row }: { row: PublicProfileActivity }) {
  const rk = resolveUpgradeRarityKey(row.rarity || "common");
  const glow = RARITY_UPGRADE_IMAGE_GLOW[rk] || RARITY_UPGRADE_IMAGE_GLOW.common;

  let kindLabel: string;
  let chipRub: number;
  let chipLoss = false;
  if (row.kind === "case_open") {
    kindLabel = "Кейс";
    chipRub = row.sellPrice;
  } else if (row.kind === "sell") {
    kindLabel = "Продажа";
    chipRub = row.sellPrice;
  } else if (row.win) {
    kindLabel = "Апгрейд";
    chipRub = row.targetPrice;
  } else {
    kindLabel = "Апгрейд";
    chipRub = row.stakeTotal;
    chipLoss = true;
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg border text-left ${rarityCardSurfaceUpgradeGrid(row.rarity || "common")} hover:brightness-110`}
    >
      <div className="relative aspect-square w-full">
        <div
          aria-hidden
          className={`pointer-events-none absolute left-1/2 top-[44%] z-0 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl opacity-100 saturate-125 ${glow}`}
        />
        {row.image ? (
          <Image
            src={preferHighResSteamEconomyImage(row.image) ?? row.image}
            alt=""
            fill
            draggable={false}
            className={`z-[1] object-contain p-1 sm:p-1.5 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] ${SKIN_IMG_QUALITY_CLASS}`}
            quality={100}
            sizes="(max-width: 640px) 22vw, 12vw"
            unoptimized
          />
        ) : (
          <div className="relative z-[1] flex h-full items-center justify-center text-[10px] text-zinc-600">?</div>
        )}

        <div className="pointer-events-none absolute left-1 top-1 z-[2] max-w-[calc(100%-3.5rem)]">
          <span className="inline-block rounded border border-cb-stroke/50 bg-black/70 px-1 py-px text-[6px] font-black uppercase tracking-wide text-zinc-300 sm:text-[7px]">
            {kindLabel}
          </span>
        </div>

        <div
          className={`pointer-events-none absolute right-0.5 top-0.5 z-[2] sm:right-1 sm:top-1 ${chipLoss ? PRICE_TAG_LOSS : PRICE_TAG_GRID}`}
          title={chipLoss ? formatSiteAmountSpaced(chipRub) : undefined}
        >
          {chipLoss ? (
            <span className={PRICE_NUM_LOSS}>−{formatRubSpaced(chipRub)} {SITE_CURRENCY_CODE}</span>
          ) : (
            <>
              <span className={`min-w-0 ${PRICE_NUM_GRID}`}>{formatRubSpaced(chipRub)}</span>
              <RoundedZapIcon className="h-[10px] w-[10px] shrink-0 text-emerald-100 sm:h-[11px] sm:w-[11px]" />
            </>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex flex-col gap-0.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-1 pb-1 pt-4 sm:px-1.5 sm:pb-1.5 sm:pt-5">
          <time className="text-[6px] tabular-nums text-zinc-500 sm:text-[7px]">{formatWhenShort(row.at)}</time>
          <p className="line-clamp-2 text-[7px] font-medium leading-tight text-zinc-100 sm:text-[8px]" title={row.itemName}>
            {row.itemName}
          </p>
          {row.kind === "case_open" && row.caseName ? (
            <p className="line-clamp-1 text-[6px] text-zinc-500 sm:text-[7px]">{row.caseName}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
