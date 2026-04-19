"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { normRarity, rarityCardFill } from "@/components/CaseRoulette";
import { SiteShell } from "@/components/SiteShell";
import { RoundedZapIcon } from "@/components/icons/RoundedZapIcon";
import { UpgradeInviteChevrons } from "@/components/icons/UpgradeInviteChevrons";
import { apiFetch, getToken } from "@/lib/api";
import { formatRubSpaced, formatSiteAmountSpaced, SITE_CURRENCY_CODE } from "@/lib/money";
import { preferHighResSteamEconomyImage, SKIN_IMG_QUALITY_CLASS } from "@/lib/steamImage";
import { requestAuthModal } from "@/lib/authModal";
import { peekUpgradeBootstrapCache, writeUpgradeBootstrapCache } from "@/lib/upgradePrefetch";
import {
  getRouletteSoundMuted,
  playUpgradeChipClick,
  primeRouletteAudio,
  ROULETTE_SOUND_MUTED_LS_KEY,
  setRouletteSoundMuted,
  startRouletteSpinTicks,
} from "@/lib/rouletteSound";

type InvItem = {
  itemId: string;
  name: string;
  image?: string;
  rarity?: string;
  sellPrice: number;
  marketPriceRub?: number | null;
  withdrawalPending?: boolean;
  caseSlug?: string;
};

/** Взнос і підсумки — як на сервері: спочатку market.csgo, інакше збережена sellPrice */
function effectiveInvPriceRub(it: InvItem): number {
  const m = it.marketPriceRub;
  if (m != null && m > 0) return Math.floor(m);
  return Math.floor(Number(it.sellPrice) || 0);
}

type CatalogItem = {
  id: string;
  name: string;
  price: number;
  rarity: string;
  image: string | null;
};

/** Верхня колонка без зовнішньої «картки» — лише контент (внутрішні блоки в стилі сайту). */
const UPGRADE_TOP_COLUMN = "flex min-h-0 flex-col";
const UPGRADE_TOP_FIELD_TITLE =
  "text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500";
/** Спільна квадратна картка прев’ю (взнос і ціль — той самий розмір). */
const UPGRADE_PREVIEW_CARD =
  "relative mx-auto flex aspect-square w-full max-w-[min(100%,340px)] min-h-0 shrink-0 flex-col overflow-hidden rounded-2xl bg-[#0c0b0f] px-3 py-3 shadow-[0_12px_48px_rgba(0,0,0,0.65)] sm:max-w-[min(100%,400px)] sm:rounded-[1.25rem] sm:px-4 sm:py-4";

/** Цінник скінів у сітці апгрейду (компактний HUD). */
const UPGRADE_SKIN_PRICE_TAG_GRID =
  "inline-flex max-w-[min(100%,11.5rem)] items-center gap-0.5 rounded-md border border-emerald-400/45 bg-gradient-to-b from-zinc-900/97 via-zinc-950/98 to-black/92 px-1.5 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_2px_8px_rgba(0,0,0,0.5),0_0_16px_rgba(52,211,153,0.14)] backdrop-blur-sm";
const UPGRADE_SKIN_PRICE_NUM =
  "whitespace-nowrap font-mono text-[10px] font-bold tabular-nums leading-none tracking-tight text-emerald-100 sm:text-[11px]";
/** Цінник у рядку списку (той самий стиль, трохи просторіше). */
const UPGRADE_SKIN_PRICE_TAG_ROW =
  "inline-flex max-w-full items-center gap-0.5 rounded-lg border border-emerald-400/40 bg-gradient-to-b from-zinc-900/95 to-black/90 px-2 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_14px_rgba(52,211,153,0.1)]";
const UPGRADE_SKIN_PRICE_NUM_ROW =
  "whitespace-nowrap font-mono text-[11px] font-bold tabular-nums leading-none tracking-tight text-emerald-100 sm:text-[12px]";

/** Цінник на міні-картці обраних предметів (компактніша шкала). */
const UPGRADE_STAKE_MINI_PRICE_WRAP =
  "inline-flex max-w-[min(100%,9.5rem)] origin-top-right scale-[0.82] items-center gap-0.5 rounded-md border border-emerald-400/45 bg-gradient-to-b from-zinc-900/97 via-zinc-950/98 to-black/92 px-1 py-px shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_2px_8px_rgba(0,0,0,0.5),0_0_12px_rgba(52,211,153,0.12)] backdrop-blur-sm";
const UPGRADE_STAKE_MINI_PRICE_NUM =
  "whitespace-nowrap font-mono text-[9px] font-bold tabular-nums leading-none tracking-tight text-emerald-100";

/** Мітка біля слайдера балансу */
const UPGRADE_BOOST_BADGE =
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-cyan-500/25 bg-cyan-950/20 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums tracking-tight text-cyan-300/95";

/** Ціна внизу картки цілі — яскраво-жовтий акцент (як на референсі). */
const UPGRADE_TARGET_CARD_PRICE_ROW =
  "mt-auto flex shrink-0 items-center justify-center gap-1 self-center px-1 pt-2";
const UPGRADE_TARGET_CARD_PRICE_NUM =
  "text-center font-mono text-base font-bold tabular-nums tracking-tight text-amber-400 [text-shadow:0_0_24px_rgba(251,191,36,0.25)] sm:text-lg";

/** Червоне залиття обраної картки в сітці (над фоном і зображенням, під ціною та текстом). */
const UPGRADE_GRID_SELECTED_OVERLAY = "pointer-events-none absolute inset-0 z-[1] bg-red-600/[0.44]";
/** Галочка обраного — червоне коло, білий символ; при hover — темніше коло з ✕. */
const UPGRADE_SELECTED_CHECK =
  "inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-[16px] font-bold leading-none text-white shadow-[0_2px_14px_rgba(0,0,0,0.35),0_0_20px_rgba(239,68,68,0.45)] group-hover:hidden";
const UPGRADE_SELECTED_UNCHECK =
  "inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-950/95 text-[15px] font-bold leading-none text-red-200 shadow-[0_0_18px_rgba(0,0,0,0.5)] ring-1 ring-red-500/50 group-hover:inline-flex hidden";
const UPGRADE_SELECTED_CHECK_SM =
  "inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-[14px] font-bold leading-none text-white shadow-[0_2px_12px_rgba(0,0,0,0.32),0_0_16px_rgba(239,68,68,0.4)] group-hover:hidden";
const UPGRADE_SELECTED_UNCHECK_SM =
  "inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-950/95 text-[13px] font-bold leading-none text-red-200 shadow-[0_0_14px_rgba(0,0,0,0.45)] ring-1 ring-red-500/45 group-hover:inline-flex hidden";
const UPGRADE_SELECTED_CHECK_XS =
  "inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[12px] font-bold leading-none text-white shadow-[0_2px_10px_rgba(0,0,0,0.32),0_0_14px_rgba(239,68,68,0.38)] group-hover:hidden";
const UPGRADE_SELECTED_UNCHECK_XS =
  "inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-950/95 text-[11px] font-bold leading-none text-red-200 shadow-[0_0_12px_rgba(0,0,0,0.45)] ring-1 ring-red-500/45 group-hover:inline-flex hidden";

const RARITY_CARD_BORDER: Record<string, string> = {
  common: "border-zinc-500/55",
  uncommon: "border-sky-400/55",
  rare: "border-blue-500/50",
  epic: "border-fuchsia-500/50",
  legendary: "border-amber-400/55",
  consumer: "border-zinc-400/50",
  industrial: "border-slate-400/50",
  milspec: "border-blue-500/50",
  "mil-spec": "border-blue-500/50",
  restricted: "border-violet-500/50",
  classified: "border-fuchsia-500/50",
  covert: "border-red-600/55",
  extraordinary: "border-amber-400/55",
  contraband: "border-orange-500/55",
};

/** Нормалізація ключа рідкості для карток апґрейду (сітка). */
function resolveUpgradeRarityKey(r: string): string {
  let rk = normRarity(r);
  if (!(rk in rarityCardFill)) {
    const k = String(r || "").toLowerCase();
    if (k.includes("extraordinary")) rk = "extraordinary";
    else if (k.includes("contraband")) rk = "contraband";
    else if (k.includes("covert")) rk = "covert";
    else if (k.includes("classified")) rk = "classified";
    else if (k.includes("restricted")) rk = "restricted";
    else if (k.includes("legendary")) rk = "legendary";
    else if (k.includes("uncommon")) rk = "uncommon";
    else if (k.includes("milspec") || k.includes("mil-spec") || k.includes("mil spec")) rk = "milspec";
    else if (k.includes("industrial")) rk = "industrial";
    else if (k.includes("consumer")) rk = "consumer";
    else if (k.includes("epic")) rk = "epic";
    else if (k.includes("rare")) rk = "rare";
    else rk = "common";
  }
  return rk;
}

/** Зовнішнє неонове світіння (відповідає кольору бордера). */
const RARITY_UPGRADE_NEON_OUTER: Record<string, string> = {
  common:
    "shadow-[0_0_8px_rgba(161,161,170,0.22),0_0_18px_rgba(113,113,122,0.14),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  uncommon:
    "shadow-[0_0_9px_rgba(56,189,248,0.26),0_0_20px_rgba(14,165,233,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  rare: "shadow-[0_0_9px_rgba(59,130,246,0.26),0_0_20px_rgba(37,99,235,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  epic: "shadow-[0_0_9px_rgba(217,70,239,0.26),0_0_20px_rgba(192,38,211,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  legendary:
    "shadow-[0_0_9px_rgba(251,191,36,0.26),0_0_20px_rgba(245,158,11,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  consumer:
    "shadow-[0_0_8px_rgba(161,161,170,0.2),0_0_18px_rgba(113,113,122,0.12),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  industrial:
    "shadow-[0_0_8px_rgba(148,163,184,0.22),0_0_19px_rgba(100,116,139,0.13),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  milspec:
    "shadow-[0_0_9px_rgba(59,130,246,0.26),0_0_20px_rgba(37,99,235,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  "mil-spec":
    "shadow-[0_0_9px_rgba(59,130,246,0.26),0_0_20px_rgba(37,99,235,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  restricted:
    "shadow-[0_0_9px_rgba(139,92,246,0.26),0_0_20px_rgba(124,58,237,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  classified:
    "shadow-[0_0_9px_rgba(217,70,239,0.26),0_0_20px_rgba(192,38,211,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
  covert:
    "shadow-[0_0_10px_rgba(239,68,68,0.28),0_0_22px_rgba(220,38,38,0.16),inset_0_0_0_1px_rgba(255,255,255,0.045)]",
  extraordinary:
    "shadow-[0_0_9px_rgba(251,191,36,0.28),0_0_22px_rgba(234,179,8,0.16),inset_0_0_0_1px_rgba(255,255,255,0.045)]",
  contraband:
    "shadow-[0_0_9px_rgba(249,115,22,0.26),0_0_20px_rgba(234,88,12,0.15),inset_0_0_0_1px_rgba(255,255,255,0.04)]",
};

/** Радіальний градієнт за прев’ю цілі — колір якості (узгоджено з неоном карток). */
const RARITY_TARGET_AURA_CENTER: Record<string, string> = {
  common: "rgba(161,161,170,0.52)",
  uncommon: "rgba(56,189,248,0.5)",
  rare: "rgba(59,130,246,0.5)",
  epic: "rgba(217,70,239,0.5)",
  legendary: "rgba(251,191,36,0.5)",
  consumer: "rgba(161,161,170,0.48)",
  industrial: "rgba(148,163,184,0.5)",
  milspec: "rgba(59,130,246,0.5)",
  "mil-spec": "rgba(59,130,246,0.5)",
  restricted: "rgba(139,92,246,0.5)",
  classified: "rgba(217,70,239,0.5)",
  covert: "rgba(239,68,68,0.58)",
  extraordinary: "rgba(251,191,36,0.52)",
  contraband: "rgba(234,88,12,0.58)",
};

function targetPreviewAuraStyle(rk: string): CSSProperties {
  const c = RARITY_TARGET_AURA_CENTER[rk] || RARITY_TARGET_AURA_CENTER.common;
  return {
    background: `radial-gradient(ellipse 72% 66% at 50% 48%, ${c} 0%, transparent 70%)`,
  };
}

/** Пляма позаду скіна — той самий відтінок, що й `RARITY_CARD_BORDER`, лише м’якша прозорість для блюру. */
const RARITY_UPGRADE_IMAGE_GLOW: Record<string, string> = {
  common: "bg-zinc-500/50",
  uncommon: "bg-sky-400/50",
  rare: "bg-blue-500/50",
  epic: "bg-fuchsia-500/50",
  legendary: "bg-amber-400/50",
  consumer: "bg-zinc-400/50",
  industrial: "bg-slate-400/50",
  milspec: "bg-blue-500/50",
  "mil-spec": "bg-blue-500/50",
  restricted: "bg-violet-500/50",
  classified: "bg-fuchsia-500/50",
  covert: "bg-red-600/50",
  extraordinary: "bg-amber-400/50",
  contraband: "bg-orange-500/50",
};

/** Те саме залиття, що й картки рулетки кейсу + бордер. Fallback для дивних рядків з API. */
function rarityCardSurface(r: string) {
  const rk = resolveUpgradeRarityKey(r);
  const fill = rarityCardFill[rk] || rarityCardFill.common;
  const line = RARITY_CARD_BORDER[rk] || RARITY_CARD_BORDER.common;
  return `${line} ${fill}`;
}

/** Сітка апґрейду: бордер за рідкістю + неон навколо картки (без градієнта в чорний низ). */
function rarityCardSurfaceUpgradeGrid(r: string) {
  const rk = resolveUpgradeRarityKey(r);
  const line = RARITY_CARD_BORDER[rk] || RARITY_CARD_BORDER.common;
  const neon = RARITY_UPGRADE_NEON_OUTER[rk] || RARITY_UPGRADE_NEON_OUTER.common;
  return `${line} bg-black/25 ${neon}`;
}

function pickTargetNearPrice(catalog: CatalogItem[], inputSum: number, targetPrice: number): string | null {
  if (inputSum <= 0 || !Number.isFinite(targetPrice)) return null;
  const cands = catalog.filter((t) => t.price > inputSum);
  if (!cands.length) return null;
  const best = cands.reduce((a, t) =>
    Math.abs(t.price - targetPrice) < Math.abs(a.price - targetPrice) ? t : a,
  cands[0]);
  return best.id;
}

/** Розбити назву скіну на «категорію» (до |) і основний заголовок — як на референсі. */
function splitTargetDisplayName(name: string): { category: string | null; title: string } {
  const i = name.indexOf("|");
  if (i === -1) return { category: null, title: name.trim() };
  const left = name.slice(0, i).trim();
  const right = name.slice(i + 1).trim();
  return { category: left || null, title: right || name.trim() };
}

/**
 * Умовна частка «1/x» у % (взнос / ціль) — тільки для дуги та цифри в центрі.
 * Кидок на сервері: win ⟺ roll &lt; pWin за RTP (нижче за цей показник).
 */
function fairArcPctFromStakeAndTarget(stakeTotal: number, targetPrice: number): number {
  const s = Number(stakeTotal);
  const p = Number(targetPrice);
  if (!Number.isFinite(s) || !Number.isFinite(p) || s <= 0 || p <= s) return 0;
  return Math.min(100, (s / p) * 100);
}

/** Сітка 5×3 під фіксовану висоту панелі; список — компактні рядки без внутрішнього скролу. */
const UPGRADE_PAGE_GRID = 15;
const UPGRADE_PAGE_LIST = 8;

function upgradePaginationModel(
  current: number,
  total: number,
  siblingCount = 2,
): (number | "ellipsis")[] {
  if (total < 1) return [];
  if (total <= siblingCount * 2 + 3) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [];
  const push = (x: number | "ellipsis") => {
    if (pages.length && pages[pages.length - 1] === x) return;
    pages.push(x);
  };
  push(1);
  const left = Math.max(2, current - siblingCount);
  const right = Math.min(total - 1, current + siblingCount);
  if (left > 2) push("ellipsis");
  for (let i = left; i <= right; i++) push(i);
  if (right < total - 1) push("ellipsis");
  push(total);
  return pages;
}

function UpgradePageStripPagination({
  page,
  totalPages,
  disabled,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  disabled?: boolean;
  onPageChange: (next: number) => void;
}) {
  if (totalPages < 1) return null;
  const model = upgradePaginationModel(page, totalPages, 2);
  const navBtn =
    "rounded-[3px] px-1.5 py-0.5 text-sm font-bold text-cb-flame transition enabled:hover:brightness-125 disabled:opacity-35 sm:rounded-[4px] sm:px-2";
  return (
    <div className="mt-3 flex flex-col items-center gap-2 border-t border-cb-stroke/45 pt-3">
      <p className="text-center text-[10px] text-zinc-500">Всего страниц: {totalPages}</p>
      {totalPages > 1 ? (
        <nav className="flex flex-wrap items-center justify-center gap-0.5 sm:gap-1" aria-label="Страницы">
          <button type="button" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)} className={navBtn} aria-label="Предыдущая страница">
            &lt;
          </button>
          {model.map((item, idx) =>
            item === "ellipsis" ? (
              <span key={`e-${idx}`} className="px-0.5 text-[11px] text-zinc-500">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                disabled={disabled}
                onClick={() => onPageChange(item)}
                className={`min-w-[1.65rem] rounded-[3px] px-1.5 py-0.5 text-[11px] tabular-nums transition sm:min-w-[1.75rem] sm:rounded-[4px] sm:px-2 sm:text-[12px] ${
                  item === page ? "font-bold text-white" : "font-medium text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={navBtn}
            aria-label="Следующая страница"
          >
            &gt;
          </button>
        </nav>
      ) : null}
    </div>
  );
}

/** Коло: дуга й цифра = fair 1/x; реальний pWin лише для кута стрілки після /run. */
const GAUGE_R = 36;
const GAUGE_C = 2 * Math.PI * GAUGE_R;

/** Тривалість обертання стрілки після апгрейду (CSS transition і setTimeout мають збігатися). */
const UPGRADE_SPIN_DURATION_MS = 6500;
const UPGRADE_SPIN_DURATION_SEC = UPGRADE_SPIN_DURATION_MS / 1000;

/**
 * Сервер: win ⟺ roll < pWin. Червона дуга = `arcFraction` (косметичний 1/x); стрілка зіставляє roll з фактичним pWin.
 */
function rollToGaugeLandDegrees(roll: number, pWin: number, arcFraction: number): number {
  const p = Math.min(1, Math.max(0, pWin));
  const n = Math.min(1, Math.max(0, arcFraction));
  if (roll < p) {
    if (p <= 0) return 0;
    return (roll / p) * n * 360;
  }
  if (p >= 1) return n * 360;
  const u = (roll - p) / (1 - p);
  return (n + u * (1 - n)) * 360;
}

function UpgradeGauge({
  /** Відображувана дуга/цифра: частка взнос/ціль (інтуїтивний «1/x»), не фінальний RTP */
  displayArcPct,
  /** Фактичний поріг з сервера — тільки для кута стрілки після /run */
  serverPWin,
  roll,
  spinning,
  spinKey,
  done,
}: {
  displayArcPct: number;
  serverPWin: number | null;
  roll: number | null;
  spinning: boolean;
  spinKey: number;
  done: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const gradId = `ug-grad-${uid}`;
  const glowId = `ug-glow-${uid}`;
  const pWin =
    serverPWin != null && Number.isFinite(serverPWin)
      ? Math.min(1, Math.max(0, serverPWin))
      : 0;
  const pctClamped = Math.min(100, Math.max(0, Number(displayArcPct) || 0));
  const arcFrac = pctClamped / 100;
  const progressLen = arcFrac * GAUGE_C;
  const labelPct = pctClamped;
  const land =
    roll == null || pWin <= 0
      ? 0
      : rollToGaugeLandDegrees(roll, pWin, arcFrac);
  const targetRot = 4 * 360 + land;
  const [rot, setRot] = useState(0);

  useEffect(() => {
    if (spinning) {
      setRot(0);
      const id = window.setTimeout(() => setRot(targetRot), 80);
      return () => clearTimeout(id);
    }
    if (done && roll != null) setRot(targetRot);
    else setRot(0);
  }, [spinning, spinKey, done, roll, targetRot]);

  const dashTransition = "stroke-dasharray 0.75s cubic-bezier(0.33, 1, 0.68, 1)";
  const idleNeedle = !spinning && !done;
  const hasChance = pctClamped > 0;

  return (
    <div className="relative mx-auto flex w-full max-w-[340px] flex-col items-center sm:max-w-[380px]">
      <div className="relative aspect-square w-full">
        {/* Повільний конусний ореол */}
        <div
          className="pointer-events-none absolute inset-[1%] z-0 rounded-full opacity-[0.22] blur-[2px] animate-ug-halo-spin motion-reduce:animate-none"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(239,68,68,0.35) 90deg, transparent 180deg, rgba(248,113,113,0.2) 270deg, transparent 360deg)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-[6%] z-0 rounded-full bg-red-500/25 blur-2xl animate-ug-glow-pulse motion-reduce:animate-none"
          aria-hidden
        />
        <svg className="relative z-[1] h-full w-full -rotate-90 drop-shadow-[0_0_20px_rgba(220,38,38,0.12)]" viewBox="0 0 100 100" aria-hidden>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="40%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx="50"
            cy="50"
            r={GAUGE_R}
            fill="none"
            stroke="rgba(15,10,12,0.95)"
            strokeWidth="10"
          />
          <circle
            cx="50"
            cy="50"
            r={GAUGE_R}
            fill="none"
            stroke="rgba(55,25,30,0.85)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={GAUGE_R}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="8"
            strokeLinecap="butt"
            strokeDasharray={`${progressLen} ${GAUGE_C}`}
            filter={`url(#${glowId})`}
            style={{ transition: dashTransition }}
            className={
              hasChance
                ? "motion-safe:animate-ug-arc-soft motion-reduce:animate-none"
                : ""
            }
          />
          {/* Мітка межі «виграш / програш» за дугою */}
          {arcFrac > 0.02 && arcFrac < 0.998 ? (
            <line
              key={`tick-${pctClamped.toFixed(1)}`}
              x1={50 + GAUGE_R * Math.cos(arcFrac * 2 * Math.PI)}
              y1={50 + GAUGE_R * Math.sin(arcFrac * 2 * Math.PI)}
              x2={50 + (GAUGE_R + 5) * Math.cos(arcFrac * 2 * Math.PI)}
              y2={50 + (GAUGE_R + 5) * Math.sin(arcFrac * 2 * Math.PI)}
              stroke="rgba(250,250,250,0.65)"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="animate-ug-tick-fade motion-reduce:animate-none"
            />
          ) : null}
        </svg>
        <div className="pointer-events-none absolute inset-0 z-[2] text-[10px] font-bold tracking-tight text-zinc-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          <span className="absolute left-1/2 top-[3%] -translate-x-1/2 transition-colors duration-500">
            0%
          </span>
          <span className="absolute right-[4%] top-1/2 -translate-y-1/2 transition-colors duration-500">
            25%
          </span>
          <span className="absolute bottom-[3%] left-1/2 -translate-x-1/2 transition-colors duration-500">
            50%
          </span>
          <span className="absolute left-[4%] top-1/2 -translate-y-1/2 transition-colors duration-500">
            75%
          </span>
        </div>
        <div
          key={spinKey}
          className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center"
          style={{
            transform: `rotate(${rot}deg)`,
            transition: spinning
              ? `transform ${UPGRADE_SPIN_DURATION_SEC}s cubic-bezier(0.12, 0.85, 0.15, 1)`
              : "transform 0.35s ease-out",
          }}
        >
          <div className="absolute top-[8%] flex h-[34%] w-2 items-end justify-center sm:w-2.5">
            <div
              className={`h-full w-full rounded-none bg-gradient-to-b from-white via-red-200 to-cb-flame shadow-[0_0_14px_rgba(255,70,70,0.95)] ring-1 ring-white/30 ${
                idleNeedle
                  ? "motion-safe:animate-ug-needle-idle motion-reduce:animate-none"
                  : ""
              }`}
            />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
          <div
            className={`rounded-2xl border-2 border-cb-flame/35 bg-black/70 px-3 py-1.5 backdrop-blur-sm transition-shadow duration-500 sm:px-3.5 sm:py-2 ${
              hasChance && !spinning
                ? "motion-safe:animate-ug-hub-breathe motion-reduce:animate-none shadow-[0_0_24px_rgba(220,38,38,0.3)]"
                : "shadow-[0_0_24px_rgba(220,38,38,0.25)]"
            } ${spinning ? "scale-[1.02] border-cb-flame/55" : ""}`}
          >
            <span className="block text-center text-[8px] font-bold uppercase tracking-wider text-zinc-500">
              ШАНС
            </span>
            <span className="font-mono text-base font-black tabular-nums text-cb-flame sm:text-lg">
              {labelPct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const panelClass =
  "rounded-2xl border border-cb-stroke/90 bg-gradient-to-br from-black/50 via-cb-panel/95 to-zinc-950 shadow-[inset_0_1px_0_rgba(255,49,49,0.08)]";

/** Кнопки x2 / %% — паралелограм як на макеті; стиль = cb-panel / cb-stroke / ледве cb-flame у світлі. */
const UPGRADE_QUICK_PICK_SKEW = "-skew-x-[8deg] transform-gpu backface-hidden";
const UPGRADE_QUICK_PICK_UNSKEW =
  "inline-block skew-x-[8deg] transform-gpu antialiased subpixel-antialiased";
/** База: як панелі сайту; зовнішній shadow у neutral / accent / shuffle. */
const UPGRADE_QUICK_PICK_SKIN =
  "min-w-[2.85rem] select-none rounded-[3px] border border-cb-stroke/90 bg-gradient-to-b from-zinc-800/30 via-cb-panel to-[#030208] px-3.5 py-2.5 text-[12px] font-semibold leading-none tracking-tight text-zinc-100 transition-[filter,box-shadow,border-color] duration-200 hover:border-cb-flame/35 hover:brightness-[1.05] active:brightness-[0.97] disabled:pointer-events-none disabled:opacity-40 sm:min-w-[3rem] sm:rounded-[4px] sm:px-4 sm:py-2.5 sm:text-[13px]";

const UPGRADE_QUICK_PICK_SHADOW_NEUTRAL =
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_0_14px_-10px_rgba(255,49,49,0.12),0_2px_10px_rgba(0,0,0,0.78)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_0_18px_-8px_rgba(255,49,49,0.16),0_4px_14px_rgba(0,0,0,0.85)]";

const UPGRADE_QUICK_PICK_ACCENT: Partial<Record<string, string>> = {
  p30:
    "shadow-[inset_4px_0_0_0_rgba(255,49,49,0.92),inset_0_1px_0_rgba(255,255,255,0.07),inset_0_0_14px_-10px_rgba(255,49,49,0.14),0_2px_10px_rgba(0,0,0,0.78)] hover:shadow-[inset_4px_0_0_0_#ff6b6b,inset_0_1px_0_rgba(255,255,255,0.09),inset_0_0_18px_-8px_rgba(255,49,49,0.18),0_4px_14px_rgba(0,0,0,0.85)]",
  p50:
    "shadow-[inset_4px_0_0_0_rgba(234,179,8,0.9),inset_0_1px_0_rgba(255,255,255,0.07),inset_0_0_14px_-10px_rgba(234,179,8,0.12),0_2px_10px_rgba(0,0,0,0.78)] hover:shadow-[inset_4px_0_0_0_#fbbf24,inset_0_1px_0_rgba(255,255,255,0.09),inset_0_0_18px_-8px_rgba(250,204,21,0.16),0_4px_14px_rgba(0,0,0,0.85)]",
  p75:
    "shadow-[inset_4px_0_0_0_rgba(52,211,153,0.88),inset_0_1px_0_rgba(255,255,255,0.07),inset_0_0_14px_-10px_rgba(16,185,129,0.12),0_2px_10px_rgba(0,0,0,0.78)] hover:shadow-[inset_4px_0_0_0_#6ee7b7,inset_0_1px_0_rgba(255,255,255,0.09),inset_0_0_18px_-8px_rgba(52,211,153,0.16),0_4px_14px_rgba(0,0,0,0.85)]",
};

/** «Рандом» — фіолетове світіння як на референсі + легкий червоний «повітря» як у backdrop. */
const UPGRADE_QUICK_PICK_SHUFFLE =
  `${UPGRADE_QUICK_PICK_SKIN} ${UPGRADE_QUICK_PICK_SKEW} text-zinc-50 border-purple-500/40 bg-gradient-to-b from-purple-950/45 via-cb-panel to-[#06010c] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_22px_rgba(88,28,135,0.42),0_0_48px_rgba(255,49,49,0.07),0_2px_12px_rgba(0,0,0,0.82)] hover:border-purple-400/50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_30px_rgba(124,58,237,0.5),0_0_56px_rgba(255,49,49,0.1),0_4px_16px_rgba(0,0,0,0.88)]`;

function upgradeQuickPickClass(kind: string): string {
  if (kind === "shuffle") return UPGRADE_QUICK_PICK_SHUFFLE;
  const accent = UPGRADE_QUICK_PICK_ACCENT[kind];
  return `${UPGRADE_QUICK_PICK_SKIN} ${UPGRADE_QUICK_PICK_SKEW} ${accent ?? UPGRADE_QUICK_PICK_SHADOW_NEUTRAL}`;
}

export default function UpgradePage() {
  const [inventory, setInventory] = useState<InvItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetId, setTargetId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [quickPickBusy, setQuickPickBusy] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [showResult, setShowResult] = useState<"win" | "loss" | null>(null);
  const [lastOutcomeName, setLastOutcomeName] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [gridView, setGridView] = useState(true);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [targetsPage, setTargetsPage] = useState(1);
  const [balanceBoostPct, setBalanceBoostPct] = useState(0);
  const [previewMeta, setPreviewMeta] = useState<{
    nominalRawPct: number;
    cappedChance: boolean;
    maxChancePct: number;
  } | null>(null);
  /** Точний pWin з останнього /run (threshold) — збіг стрілки з сервером */
  const [serverPWin, setServerPWin] = useState<number | null>(null);
  /** Після /run ціль скидається — тримаємо fair 1/x для дуги до наступного вибору */
  const [gaugeHoldDisplayPct, setGaugeHoldDisplayPct] = useState<number | null>(null);
  /** null = немає фільтра з сервера (гість / нема вибору); масив з API — лише дозволені номіналом цілі */
  const [eligibleItems, setEligibleItems] = useState<CatalogItem[] | null>(null);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const eligibleFetchGen = useRef(0);
  const prevValidTargetsLenRef = useRef(0);
  /** Якщо true — не автопідставляти першу ціль при повторній появі пулу (користувач скасував вибір). */
  const userClearedTargetRef = useRef(false);
  /** Після await порівнюємо з поточним станом, без застарілого `selected` у замиканні. */
  const selectedRef = useRef(selected);
  const balanceBoostPctRef = useRef(balanceBoostPct);
  const spinSoundStopRef = useRef<(() => void) | null>(null);
  selectedRef.current = selected;
  balanceBoostPctRef.current = balanceBoostPct;

  useEffect(() => {
    return () => {
      spinSoundStopRef.current?.();
      spinSoundStopRef.current = null;
    };
  }, []);

  /**
   * Токен лише після mount: на SSR `getToken()` завжди null, у клієнта одразу може бути строка —
   * тоді `useServerEligible` змінює DOM і ламає гідратацію.
   */
  const [hasBrowserToken, setHasBrowserToken] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  useEffect(() => {
    const sync = () => setHasBrowserToken(Boolean(getToken()));
    sync();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, []);

  useEffect(() => {
    const syncMuted = () => setSoundMuted(getRouletteSoundMuted());
    syncMuted();
    const onStorage = (e: StorageEvent) => {
      if (e.key === ROULETTE_SOUND_MUTED_LS_KEY || e.key === null) syncMuted();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", syncMuted);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", syncMuted);
    };
  }, []);

  const clearTargetSelection = useCallback(() => {
    userClearedTargetRef.current = true;
    setTargetId("");
    setShowResult(null);
    setLastRoll(null);
    setServerPWin(null);
    setGaugeHoldDisplayPct(null);
  }, []);

  const loadAll = useCallback(async () => {
    if (!getToken()) {
      setInventory([]);
      setBalance(0);
      return;
    }
    const warm = peekUpgradeBootstrapCache();
    if (warm) {
      setInventory(warm.inventory as InvItem[]);
      setBalance(warm.balance);
      setCatalog(warm.catalog as CatalogItem[]);
    }
    const [meR, catR] = await Promise.all([
      apiFetch<{ inventory: InvItem[]; balance: number }>("/api/me"),
      apiFetch<{ items: CatalogItem[] }>("/api/upgrade/catalog"),
    ]);
    if (meR.ok && meR.data) {
      setInventory(Array.isArray(meR.data.inventory) ? meR.data.inventory : []);
      setBalance(Number(meR.data.balance) || 0);
    }
    if (catR.ok && catR.data?.items) setCatalog(catR.data.items);
    if (meR.ok && meR.data && catR.ok && catR.data?.items) {
      writeUpgradeBootstrapCache({
        inventory: Array.isArray(meR.data.inventory) ? meR.data.inventory : [],
        balance: Number(meR.data.balance) || 0,
        catalog: catR.data.items,
      });
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        const row = inventory.find((x) => x.itemId === id);
        if (row && !row.withdrawalPending) next.add(id);
      }
      return next;
    });
  }, [inventory]);

  const inputSum = useMemo(() => {
    let s = 0;
    selected.forEach((id) => {
      const it = inventory.find((x) => x.itemId === id);
      if (it) s += effectiveInvPriceRub(it);
    });
    return s;
  }, [selected, inventory]);

  const balanceBoostRub = useMemo(() => {
    const b = Number(balance) || 0;
    const p = Math.min(100, Math.max(0, Number(balanceBoostPct) || 0));
    if (b <= 0 || p <= 0) return 0;
    return Math.min(b, Math.floor((b * p) / 100));
  }, [balance, balanceBoostPct]);

  const stakeTotal = useMemo(() => inputSum + balanceBoostRub, [inputSum, balanceBoostRub]);

  const useServerEligible = selected.size >= 1 && stakeTotal > 0 && hasBrowserToken;

  /**
   * У режимі «Подходящие скины» пул строго з /eligible-targets (ціна + nominal gateway на сервері).
   * Fallback каталогу по price > stake давав зайві цілі й ламав рандом / кнопки пресетів.
   */
  const targetPool = useMemo(() => {
    if (!useServerEligible) {
      return catalog;
    }
    if (eligibleLoading) {
      return [];
    }
    if (eligibleItems !== null) {
      return eligibleItems;
    }
    return [];
  }, [catalog, eligibleItems, eligibleLoading, useServerEligible]);

  const validTargets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minP = priceMin === "" ? null : Number(priceMin);
    const maxP = priceMax === "" ? null : Number(priceMax);
    return targetPool.filter((t) => {
      if (t.price <= stakeTotal) return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      if (minP != null && Number.isFinite(minP) && t.price < minP) return false;
      if (maxP != null && Number.isFinite(maxP) && t.price > maxP) return false;
      return true;
    });
  }, [targetPool, stakeTotal, search, priceMin, priceMax]);

  /** Ціль заліковна для /run, якщо вона в серверному списку eligible (не лише в ум. сітці з пошуком). */
  const targetAllowedForUpgrade = useMemo(() => {
    if (!targetId) return false;
    if (!useServerEligible) return validTargets.some((t) => t.id === targetId);
    if (eligibleItems !== null) return eligibleItems.some((t) => t.id === targetId);
    return false;
  }, [targetId, useServerEligible, eligibleItems, validTargets]);

  const pageSizePanels = gridView ? UPGRADE_PAGE_GRID : UPGRADE_PAGE_LIST;

  const inventoryTotalPages = useMemo(
    () => Math.max(1, Math.ceil(inventory.length / pageSizePanels) || 1),
    [inventory.length, pageSizePanels],
  );
  const inventoryPageClamped = Math.min(Math.max(1, inventoryPage), inventoryTotalPages);
  const inventoryPageSlice = useMemo(() => {
    const offset = (inventoryPageClamped - 1) * pageSizePanels;
    return inventory.slice(offset, offset + pageSizePanels);
  }, [inventory, inventoryPageClamped, pageSizePanels]);

  const targetsTotalPages = useMemo(
    () => Math.max(1, Math.ceil(validTargets.length / pageSizePanels) || 1),
    [validTargets.length, pageSizePanels],
  );
  const targetsPageClamped = Math.min(Math.max(1, targetsPage), targetsTotalPages);
  const targetsPageSlice = useMemo(() => {
    const offset = (targetsPageClamped - 1) * pageSizePanels;
    return validTargets.slice(offset, offset + pageSizePanels);
  }, [validTargets, targetsPageClamped, pageSizePanels]);

  useEffect(() => {
    setInventoryPage((p) => Math.min(Math.max(1, p), inventoryTotalPages));
  }, [inventoryTotalPages]);

  useEffect(() => {
    setTargetsPage((p) => Math.min(Math.max(1, p), targetsTotalPages));
  }, [targetsTotalPages]);

  useEffect(() => {
    setTargetsPage(1);
  }, [search, priceMin, priceMax]);

  useEffect(() => {
    if (!useServerEligible) {
      setEligibleItems(null);
      setEligibleLoading(false);
      return;
    }
    eligibleFetchGen.current += 1;
    const gen = eligibleFetchGen.current;
    setEligibleLoading(true);
    setEligibleItems(null);
    const inputItemIds = Array.from(selected);
    const boost = balanceBoostPct;
    const t = window.setTimeout(() => {
      void (async () => {
        const r = await apiFetch<{ items: CatalogItem[] }>("/api/upgrade/eligible-targets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inputItemIds,
            balanceBoostPct: boost,
          }),
        });
        if (gen !== eligibleFetchGen.current) return;
        setEligibleLoading(false);
        if (r.ok && r.data && Array.isArray(r.data.items)) {
          setEligibleItems(r.data.items);
        } else {
          setEligibleItems(null);
        }
      })();
    }, 100);
    return () => clearTimeout(t);
  }, [useServerEligible, selected, stakeTotal, balanceBoostPct]);

  /**
   * — Якщо цілі немає в пулі — підставити першу з пулу.
   * — Якщо targetId порожній після кліку / хрестика — не чіпати (раніше одразу ставилась перша ціль — виглядало як баг).
   * — Якщо пул щойно з’явився (0 → N) і цілі ще нема — як раніше, обрати першу.
   * — Ціль можуть приховати пошук/ціна, але вона лишається, якщо є в eligible з API.
   */
  useEffect(() => {
    if (spinning) return;
    const prevLen = prevValidTargetsLenRef.current;
    const n = validTargets.length;
    prevValidTargetsLenRef.current = n;

    const inServerEligible =
      Boolean(useServerEligible && eligibleItems !== null && targetId) &&
      eligibleItems!.some((t) => t.id === targetId);

    if (n === 0) {
      if (targetId && !inServerEligible) setTargetId("");
      return;
    }
    if (targetId && !validTargets.some((t) => t.id === targetId)) {
      if (inServerEligible) return;
      userClearedTargetRef.current = false;
      setTargetId(validTargets[0]?.id || "");
      return;
    }
    if (prevLen === 0 && n > 0 && !targetId && !userClearedTargetRef.current) {
      setTargetId(validTargets[0]!.id);
    }
  }, [validTargets, targetId, spinning, useServerEligible, eligibleItems]);

  const refreshPreview = useCallback(async () => {
    if (!getToken() || selected.size < 1 || !targetId) {
      setPreviewMeta(null);
      return;
    }
    const r = await apiFetch<{
      nominalRawPct?: number;
      serverBalance?: number;
      limits?: {
        minPct: number;
        maxPct: number;
        cappedChanceByMax?: boolean;
      };
    }>("/api/upgrade/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputItemIds: Array.from(selected),
        targetId,
        balanceBoostPct,
      }),
    });
    if (r.ok && r.data) {
      if (typeof r.data.serverBalance === "number" && Number.isFinite(r.data.serverBalance)) {
        setBalance(r.data.serverBalance);
      }
      const lim = r.data.limits;
      const raw = r.data.nominalRawPct;
      if (
        lim != null &&
        typeof raw === "number" &&
        Number.isFinite(lim.maxPct) &&
        Number.isFinite(raw)
      ) {
        setPreviewMeta({
          nominalRawPct: raw,
          cappedChance: Boolean(lim.cappedChanceByMax),
          maxChancePct: lim.maxPct,
        });
      } else {
        setPreviewMeta(null);
      }
      setErr(null);
    } else {
      setPreviewMeta(null);
      setErr(r.error || null);
    }
  }, [selected, targetId, balanceBoostPct]);

  useEffect(() => {
    const t = setTimeout(() => void refreshPreview(), 320);
    return () => clearTimeout(t);
  }, [refreshPreview]);

  const applyQuickPick = useCallback(
    async (kind: "x2" | "x5" | "x10" | "p30" | "p50" | "p75" | "shuffle") => {
      if (spinning || quickPickBusy || inputSum <= 0 || selectedRef.current.size < 1) return;

      const inputIdsSnapshot = [...selectedRef.current].sort();
      const key0 = inputIdsSnapshot.join("\0");
      const boost0 = balanceBoostPctRef.current;

      const resetPickMeta = () => {
        setShowResult(null);
        setLastRoll(null);
        setServerPWin(null);
        setGaugeHoldDisplayPct(null);
      };

      const pickFromPool = (pool: CatalogItem[], stakePick: number) => {
        if (!pool.length || !(stakePick > 0)) return;
        let id: string | null = null;
        if (kind === "shuffle") id = pool[Math.floor(Math.random() * pool.length)]!.id;
        else if (kind === "x2") id = pickTargetNearPrice(pool, stakePick, stakePick * 2);
        else if (kind === "x5") id = pickTargetNearPrice(pool, stakePick, stakePick * 5);
        else if (kind === "x10") id = pickTargetNearPrice(pool, stakePick, stakePick * 10);
        else if (kind === "p30") id = pickTargetNearPrice(pool, stakePick, stakePick / 0.3);
        else if (kind === "p50") id = pickTargetNearPrice(pool, stakePick, stakePick / 0.5);
        else if (kind === "p75") id = pickTargetNearPrice(pool, stakePick, stakePick / 0.75);
        if (id) {
          playUpgradeChipClick(getRouletteSoundMuted());
          userClearedTargetRef.current = false;
          setTargetId(id);
          resetPickMeta();
        }
      };

      if (useServerEligible && getToken()) {
        setQuickPickBusy(true);
        try {
          const r = await apiFetch<{
            items: CatalogItem[];
            stakeTotal?: number;
            inputSum?: number;
            balanceBoostRub?: number;
          }>("/api/upgrade/eligible-targets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              inputItemIds: inputIdsSnapshot,
              balanceBoostPct: boost0,
            }),
          });
          const idsNow = [...selectedRef.current].sort().join("\0");
          if (idsNow !== key0 || balanceBoostPctRef.current !== boost0) return;
          if (!r.ok || !r.data?.items?.length) return;
          const serverStake =
            typeof r.data.stakeTotal === "number" &&
            Number.isFinite(r.data.stakeTotal) &&
            r.data.stakeTotal > 0
              ? r.data.stakeTotal
              : stakeTotal;
          const poolStrict = r.data.items.filter((t) => Number(t.price) > serverStake);
          if (!poolStrict.length) return;
          setEligibleLoading(false);
          setEligibleItems(r.data.items);
          pickFromPool(poolStrict, serverStake);
        } finally {
          setQuickPickBusy(false);
        }
        return;
      }

      if (!validTargets.length) return;
      pickFromPool(validTargets, stakeTotal);
    },
    [spinning, quickPickBusy, inputSum, stakeTotal, useServerEligible, validTargets],
  );

  /** Ціль з каталогу або з відповіді eligible — інакше при порожньому/повільному /catalog прев’ю ламається. */
  const target = useMemo(() => {
    if (!targetId) return undefined;
    return (
      catalog.find((t) => t.id === targetId) ||
      eligibleItems?.find((t) => t.id === targetId) ||
      undefined
    );
  }, [targetId, catalog, eligibleItems]);

  const fairArcPct = useMemo(
    () => fairArcPctFromStakeAndTarget(stakeTotal, target?.price ?? 0),
    [stakeTotal, target?.price],
  );

  const selectedItems = useMemo(
    () => inventory.filter((i) => selected.has(i.itemId)),
    [inventory, selected],
  );

  function toggleSel(id: string) {
    if (spinning) return;
    const row = inventory.find((x) => x.itemId === id);
    if (row?.withdrawalPending) return;
    const prev = selectedRef.current;
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else if (next.size < 6) next.add(id);
    else return;
    playUpgradeChipClick(getRouletteSoundMuted());
    setSelected(next);
    setShowResult(null);
    setLastRoll(null);
    setServerPWin(null);
    setGaugeHoldDisplayPct(null);
  }

  async function runUpgrade() {
    if (!getToken()) {
      requestAuthModal("/upgrade");
      return;
    }
    primeRouletteAudio();
    setErr(null);
    setBusy(true);
    setShowResult(null);
    setLastRoll(null);
    setServerPWin(null);
    setGaugeHoldDisplayPct(null);
    setLastOutcomeName(null);
    const holdArc =
      target && stakeTotal > 0 ? fairArcPctFromStakeAndTarget(stakeTotal, target.price) : 0;
    const r = await apiFetch<{
      win: boolean;
      roll: number;
      threshold?: number;
      target?: { name: string };
      item?: { itemId: string } | null;
    }>("/api/upgrade/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputItemIds: Array.from(selected),
        targetId,
        balanceBoostPct,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      setErr(r.error || "Ошибка");
      return;
    }
    const data = r.data!;
    setLastOutcomeName(data.win && data.target?.name ? data.target.name : null);
    setSpinKey((k) => k + 1);
    const rollN = typeof data.roll === "number" && Number.isFinite(data.roll) ? data.roll : null;
    setLastRoll(rollN);
    if (typeof data.threshold === "number" && Number.isFinite(data.threshold)) {
      setServerPWin(Math.min(1, Math.max(0, data.threshold)));
    }
    if (holdArc > 0) setGaugeHoldDisplayPct(holdArc);
    spinSoundStopRef.current?.();
    spinSoundStopRef.current = startRouletteSpinTicks(
      UPGRADE_SPIN_DURATION_MS,
      getRouletteSoundMuted(),
    );
    setSpinning(true);
    window.setTimeout(() => {
      void (async () => {
        setSpinning(false);
        setShowResult(data.win ? "win" : "loss");
        if (data.win && data.item?.itemId) {
          await loadAll();
          setSelected(new Set([data.item.itemId]));
          userClearedTargetRef.current = true;
          setTargetId("");
          setBalanceBoostPct(0);
        } else {
          setSelected(new Set());
          userClearedTargetRef.current = true;
          setTargetId("");
          setBalanceBoostPct(0);
          await loadAll();
        }
        window.dispatchEvent(new CustomEvent("cd-balance-updated"));
      })();
    }, UPGRADE_SPIN_DURATION_MS);
  }

  return (
    <SiteShell>
      <div className="min-h-[calc(100dvh-52px)] bg-transparent text-zinc-200">
        <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5">
          {err ? (
            <p className="mb-4 rounded-lg border border-red-500/35 bg-red-950/25 px-3 py-2 text-sm text-red-300">{err}</p>
          ) : null}

          {/* Верх: 3 колонки */}
          <div className="relative mb-6 rounded-2xl bg-cb-panel/80 bg-cb-mesh p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-5">
            <div className="grid grid-cols-1 gap-5 pt-2 xl:grid-cols-[1fr_minmax(260px,320px)_1fr] xl:items-stretch xl:gap-6">
              {/* Слева: вклад */}
              <div className={UPGRADE_TOP_COLUMN}>
                <div className="mb-3 flex w-full items-center gap-2 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !soundMuted;
                      setSoundMuted(next);
                      setRouletteSoundMuted(next);
                    }}
                    className="order-first shrink-0 rounded-lg border border-cb-stroke/70 bg-[#0a0e14]/90 p-2 text-zinc-400 shadow-md transition hover:border-zinc-600 hover:text-zinc-200 sm:p-2.5"
                    title={soundMuted ? "Включить звук рулетки" : "Выключить звук рулетки"}
                    aria-pressed={!soundMuted}
                    aria-label={soundMuted ? "Включить звук" : "Выключить звук"}
                  >
                    <span className="block text-base leading-none sm:text-lg" aria-hidden>
                      {soundMuted ? "🔇" : "🔊"}
                    </span>
                  </button>
                  <h3 className={`min-w-0 flex-1 ${UPGRADE_TOP_FIELD_TITLE}`}>
                    Выберите до 6 предметов для апгрейда
                  </h3>
                </div>
                <div className={UPGRADE_PREVIEW_CARD}>
                  <div className="pointer-events-none relative z-[2] mb-1.5 shrink-0 border-b border-white/[0.06] pb-2 text-center">
                    <p className="text-[10px] font-medium text-zinc-500">Всего в апгрейд</p>
                    {balanceBoostRub > 0 ? (
                      <p className="mt-1 flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-[10px] text-zinc-600">
                        <span>Предметы</span>
                        <span className="inline-flex items-center gap-0.5 font-mono text-zinc-400">
                          <span className="tabular-nums">{formatRubSpaced(inputSum)}</span>
                          <RoundedZapIcon className="h-2.5 w-2.5 shrink-0 text-zinc-500" />
                        </span>
                        <span aria-hidden>·</span>
                        <span>баланс +</span>
                        <span className="inline-flex items-center gap-0.5 font-mono text-zinc-400">
                          <span className="tabular-nums">{formatRubSpaced(balanceBoostRub)}</span>
                          <RoundedZapIcon className="h-2.5 w-2.5 shrink-0 text-zinc-500" />
                        </span>
                      </p>
                    ) : null}
                    <p
                      className="mt-1 flex items-center justify-center gap-1.5 font-mono text-lg font-bold tabular-nums tracking-tight text-emerald-400 [text-shadow:0_0_20px_rgba(52,211,153,0.2)] sm:text-xl"
                      aria-label={formatSiteAmountSpaced(stakeTotal)}
                    >
                      <span className="tabular-nums">{formatRubSpaced(stakeTotal)}</span>
                      <RoundedZapIcon className="h-[1.15em] w-[1.15em] shrink-0 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.35)] sm:h-[1.12em] sm:w-[1.12em]" />
                    </p>
                    {selected.size > 0 ? (
                      <p className="mt-0.5 text-[10px] text-zinc-600">{selected.size} из 6 предметов</p>
                    ) : (
                      <p className="mt-0.5 text-[10px] text-zinc-600">до 6 предметов</p>
                    )}
                  </div>
                  <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
                    {selectedItems.length === 0 ? (
                      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-2 py-1 sm:gap-4 sm:px-3">
                        <UpgradeInviteChevrons
                          variant="stake"
                          className="text-cb-flame drop-shadow-[0_0_14px_rgba(255,49,49,0.55)] sm:drop-shadow-[0_0_22px_rgba(255,49,49,0.65)]"
                        />
                        <p className="max-w-[260px] text-center text-[11px] leading-snug text-zinc-500 sm:text-xs">
                          Предметы появятся здесь
                        </p>
                        <p className="max-w-[260px] text-center text-[10px] leading-snug text-zinc-600 sm:text-[11px]">
                          Выберите скины в списке ниже
                        </p>
                      </div>
                    ) : (
                      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [-webkit-overflow-scrolling:touch]">
                        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                        {selectedItems.map((it) => {
                          const rk = resolveUpgradeRarityKey(it.rarity || "common");
                          const locked = Boolean(it.withdrawalPending);
                          const chipRub = effectiveInvPriceRub(it);
                          return (
                            <button
                              key={it.itemId}
                              type="button"
                              title="Нажмите, чтобы убрать из взноса"
                              disabled={spinning || locked}
                              onClick={() => toggleSel(it.itemId)}
                              className={`group relative aspect-square w-full min-w-0 overflow-hidden rounded-xl border text-left transition ${rarityCardSurfaceUpgradeGrid(it.rarity || "common")} ring-2 ring-cb-flame/70 ring-offset-2 ring-offset-[#0c0b0f] hover:brightness-110 disabled:pointer-events-none disabled:opacity-45`}
                            >
                              <div className="relative aspect-square w-full">
                                <div
                                  aria-hidden
                                  className={`pointer-events-none absolute left-1/2 top-[44%] z-0 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl opacity-100 saturate-125 ${RARITY_UPGRADE_IMAGE_GLOW[rk] || RARITY_UPGRADE_IMAGE_GLOW.common}`}
                                />
                                {it.image ? (
                                  <Image
                                    src={preferHighResSteamEconomyImage(it.image) ?? it.image}
                                    alt=""
                                    fill
                                    className={`z-[1] object-contain p-1 drop-shadow-[0_4px_14px_rgba(0,0,0,0.45)] ${SKIN_IMG_QUALITY_CLASS}`}
                                    quality={100}
                                    unoptimized
                                  />
                                ) : (
                                  <div className="relative z-[1] flex h-full items-center justify-center text-[10px] text-zinc-600">
                                    ?
                                  </div>
                                )}

                                <div
                                  className={`pointer-events-none absolute right-0.5 top-0.5 z-[2] scale-90 ${UPGRADE_STAKE_MINI_PRICE_WRAP}`}
                                  aria-label={formatSiteAmountSpaced(chipRub)}
                                >
                                  <span className={`min-w-0 ${UPGRADE_STAKE_MINI_PRICE_NUM}`}>{formatRubSpaced(chipRub)}</span>
                                  <RoundedZapIcon className="h-[8px] w-[8px] shrink-0 text-emerald-100" />
                                </div>

                                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex flex-col gap-0.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-1 pb-1 pt-4">
                                  <p className="line-clamp-2 text-left text-[7px] font-medium leading-tight text-zinc-100 sm:text-[8px]">
                                    {it.name}
                                  </p>
                                  {locked ? (
                                    <span className="text-[6px] font-bold uppercase text-amber-400">вывод</span>
                                  ) : null}
                                </div>

                                {!locked && (
                                  <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
                                    <span className={UPGRADE_SELECTED_CHECK_XS}>✓</span>
                                    <span className={UPGRADE_SELECTED_UNCHECK_XS}>✕</span>
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-2">
                  <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                    <span>Добавить баланс к шансу</span>
                    <span className={UPGRADE_BOOST_BADGE}>{formatSiteAmountSpaced(balanceBoostRub)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={balanceBoostPct}
                    disabled={spinning}
                    onChange={(e) => setBalanceBoostPct(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-cb-stroke/80 accent-red-600 disabled:cursor-not-allowed disabled:opacity-45"
                  />
                  <p className="mt-1 text-[10px] text-zinc-600">
                    Списывается с баланса при апгрейде (до {formatSiteAmountSpaced(balance)}). Увеличивает шанс так же, как
                    рост стоимости вклада.
                  </p>
                </div>
              </div>

              {/* Центр: индикатор + кнопка */}
              <div className="flex w-full max-w-[320px] flex-col items-center justify-center gap-3 xl:max-w-none">
                {fairArcPct <= 0 && gaugeHoldDisplayPct == null ? (
                  <p className="text-center text-[11px] text-zinc-500">Выберите предметы и цель</p>
                ) : previewMeta?.cappedChance && gaugeHoldDisplayPct == null ? (
                  <p className="max-w-[280px] text-center text-[10px] leading-snug text-amber-400/90">
                    Реальный шанс (RTP) на верхней границе ({previewMeta.maxChancePct.toFixed(0)}%)
                  </p>
                ) : null}
                <UpgradeGauge
                  displayArcPct={gaugeHoldDisplayPct ?? fairArcPct}
                  serverPWin={serverPWin}
                  roll={lastRoll}
                  spinning={spinning}
                  spinKey={spinKey}
                  done={Boolean(showResult)}
                />
                {showResult === "win" ? (
                  <p className="max-w-[260px] text-center text-[12px] font-semibold leading-snug text-cb-flame">
                    Выигрыш!{lastOutcomeName ? ` ${lastOutcomeName}` : ""} добавлено в инвентарь.
                  </p>
                ) : showResult === "loss" ? (
                  <p className="text-center text-[12px] font-semibold text-red-500">Не удалось. Предметы потеряны.</p>
                ) : null}
                <button
                  type="button"
                  disabled={
                    busy ||
                    spinning ||
                    selected.size < 1 ||
                    !targetId ||
                    !targetAllowedForUpgrade
                  }
                  onClick={() => void runUpgrade()}
                  className="group flex w-full max-w-[260px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-800 to-cb-flame py-3.5 text-[13px] font-black uppercase tracking-widest text-white shadow-[0_10px_36px_rgba(255,49,49,0.35)] transition hover:brightness-110 disabled:opacity-40"
                >
                  <span className="text-lg leading-none">⇈</span>
                  {busy || spinning ? "…" : "Апгрейд"}
                </button>
              </div>

              {/* Справа: цель */}
              <div className={UPGRADE_TOP_COLUMN}>
                <h3 className={`mb-3 ${UPGRADE_TOP_FIELD_TITLE}`}>Выберите оружие, которое хотите получить</h3>
                <div className={UPGRADE_PREVIEW_CARD}>
                  {target ? (
                    <>
                      <button
                        type="button"
                        aria-label="Снять цель"
                        disabled={spinning}
                        onClick={clearTargetSelection}
                        className="absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-[20px] font-light leading-none text-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-zinc-700 hover:text-zinc-200 disabled:pointer-events-none disabled:opacity-40"
                      >
                        ×
                      </button>
                      {(() => {
                        const { category, title } = splitTargetDisplayName(target.name);
                        return (
                          <div className="pointer-events-none relative z-[2] mb-1 shrink-0 px-2 pr-10 text-center sm:px-3 sm:pr-11">
                            {category ? (
                              <p className="text-[10px] font-medium text-zinc-500 sm:text-[11px]">{category}</p>
                            ) : null}
                            <p className="mt-0.5 line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-white sm:text-[17px]">
                              {title}
                            </p>
                          </div>
                        );
                      })()}
                      {(() => {
                        const previewRk = resolveUpgradeRarityKey(target.rarity);
                        return (
                          <div className="relative z-[1] mx-auto flex min-h-0 min-w-0 w-full max-w-[92%] flex-1 items-center justify-center">
                            <div
                              aria-hidden
                              className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2 blur-[40px] motion-reduce:blur-md"
                              style={targetPreviewAuraStyle(previewRk)}
                            />
                            <div
                              aria-hidden
                              className="pointer-events-none absolute left-1/2 top-[48%] z-0 h-[115%] w-[100%] -translate-x-1/2 -translate-y-1/2 opacity-95 motion-reduce:opacity-90"
                              style={targetPreviewAuraStyle(previewRk)}
                            />
                            <div className="relative z-[1] h-full min-h-0 w-full">
                              {target.image ? (
                                <Image
                                  src={preferHighResSteamEconomyImage(target.image) ?? target.image}
                                  alt=""
                                  fill
                                  className={`pointer-events-none object-contain drop-shadow-[0_16px_40px_rgba(0,0,0,0.55)] ${SKIN_IMG_QUALITY_CLASS}`}
                                  quality={100}
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-zinc-600">?</div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                      <div className={`relative z-[2] ${UPGRADE_TARGET_CARD_PRICE_ROW}`}>
                        <span className={`min-w-0 ${UPGRADE_TARGET_CARD_PRICE_NUM} text-left`}>{formatRubSpaced(target.price)}</span>
                        <RoundedZapIcon className="h-[1em] w-[1em] shrink-0 text-amber-400 sm:h-[1.12em] sm:w-[1.12em]" />
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-2 py-1 sm:gap-4 sm:px-3">
                      <UpgradeInviteChevrons
                        variant="target"
                        className="text-cb-flame drop-shadow-[0_0_14px_rgba(255,49,49,0.55)] sm:drop-shadow-[0_0_22px_rgba(255,49,49,0.65)]"
                      />
                      <p className="max-w-[260px] text-center text-[11px] leading-snug text-zinc-500 sm:text-xs">
                        Цель появится здесь
                      </p>
                      <p className="max-w-[260px] text-center text-[10px] leading-snug text-zinc-600 sm:text-[11px]">
                        Выберите скин в списке ниже
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 pt-2 sm:gap-2.5">
                  {(
                    [
                      ["x2", "x2"],
                      ["x5", "x5"],
                      ["x10", "x10"],
                      ["p30", "30%"],
                      ["p50", "50%"],
                      ["p75", "75%"],
                    ] as const
                  ).map(([k, lab]) => (
                    <button
                      key={k}
                      type="button"
                      disabled={spinning || quickPickBusy}
                      className={upgradeQuickPickClass(k)}
                      onClick={() => void applyQuickPick(k)}
                    >
                      <span className={UPGRADE_QUICK_PICK_UNSKEW}>{lab}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={spinning || quickPickBusy}
                    className={upgradeQuickPickClass("shuffle")}
                    onClick={() => void applyQuickPick("shuffle")}
                    title="Случайная цель"
                  >
                    <span className={`${UPGRADE_QUICK_PICK_UNSKEW} flex items-center justify-center`}>
                      <svg
                        className="size-[14px] shrink-0 sm:size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="m18 14 4 4-4 4" />
                        <path d="m18 2 4 4-4 4" />
                        <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
                        <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
                        <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Низ: две панели */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={`${panelClass} flex flex-col p-4`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-bold text-white">
                  Мои предметы <span className="font-normal text-zinc-500">({inventory.length} шт.)</span>
                </h3>
                <div className="flex items-center gap-1 rounded-lg border border-cb-stroke/80 bg-black/50 p-0.5">
                  <button
                    type="button"
                    disabled={spinning}
                    onClick={() => setGridView(true)}
                    className={`rounded-md px-2 py-1 text-[11px] disabled:opacity-40 ${gridView ? "bg-red-600/30 text-cb-flame" : "text-zinc-500"}`}
                  >
                    ▦
                  </button>
                  <button
                    type="button"
                    disabled={spinning}
                    onClick={() => setGridView(false)}
                    className={`rounded-md px-2 py-1 text-[11px] disabled:opacity-40 ${!gridView ? "bg-red-600/30 text-cb-flame" : "text-zinc-500"}`}
                  >
                    ☰
                  </button>
                </div>
              </div>

              {inventory.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
                  <p className="max-w-xs text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
                    Нет доступных предметов для апгрейда
                  </p>
                  <Link
                    href="/#cases"
                    className="rounded-xl border-2 border-cb-flame/70 bg-red-950/25 px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-cb-flame transition hover:bg-red-950/40"
                  >
                    Откройте любой кейс
                  </Link>
                </div>
              ) : gridView ? (
                <div className="flex min-h-0 flex-col">
                  <div className="max-h-[min(42vh,440px)] min-h-[220px] overflow-hidden sm:min-h-[260px] sm:max-h-[480px]">
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                      {inventoryPageSlice.map((it) => {
                      const on = selected.has(it.itemId);
                      const locked = Boolean(it.withdrawalPending);
                      const rk = resolveUpgradeRarityKey(it.rarity || "common");
                      const chipRub = effectiveInvPriceRub(it);
                      return (
                        <button
                          key={it.itemId}
                          type="button"
                          title={locked ? "Предмет на выводе" : undefined}
                          disabled={spinning || locked}
                          onClick={() => toggleSel(it.itemId)}
                          className={`group relative overflow-hidden rounded-lg border text-left transition ${rarityCardSurfaceUpgradeGrid(it.rarity || "common")} ${
                            on ? "ring-2 ring-cb-flame/70 ring-offset-2 ring-offset-[#070708]" : "hover:brightness-110"
                          } disabled:pointer-events-none disabled:opacity-45`}
                        >     
                          <div className="relative aspect-square w-full">
                            <div
                              aria-hidden
                              className={`pointer-events-none absolute left-1/2 top-[44%] z-0 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl opacity-100 saturate-125 ${RARITY_UPGRADE_IMAGE_GLOW[rk] || RARITY_UPGRADE_IMAGE_GLOW.common}`}
                            />
                            {it.image ? (
                              <Image
                                src={preferHighResSteamEconomyImage(it.image) ?? it.image}
                                alt=""
                                fill
                                className={`z-[1] object-contain p-1.5 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] ${SKIN_IMG_QUALITY_CLASS}`}
                                quality={100}
                                unoptimized
                              />
                            ) : (
                              <div className="relative z-[1] flex h-full items-center justify-center text-[10px] text-zinc-600">
                                ?
                              </div>
                            )}

                            {on && !locked ? <div aria-hidden className={UPGRADE_GRID_SELECTED_OVERLAY} /> : null}

                            <div
                              className={`pointer-events-none absolute right-1 top-1 z-[2] ${UPGRADE_SKIN_PRICE_TAG_GRID}`}
                              aria-label={formatSiteAmountSpaced(chipRub)}
                            >
                              <span className={`min-w-0 ${UPGRADE_SKIN_PRICE_NUM}`}>{formatRubSpaced(chipRub)}</span>
                              <RoundedZapIcon className="h-[10px] w-[10px] shrink-0 text-emerald-100 sm:h-[11px] sm:w-[11px]" />
                            </div>

                            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex flex-col gap-0.5 px-1.5 pb-1.5 pt-3">
                              <p className="line-clamp-2 text-[8px] font-medium leading-tight text-zinc-100 sm:text-[9px]">
                                {it.name}
                              </p>
                              {locked ? (
                                <span className="text-[7px] font-bold uppercase text-amber-400">вывод</span>
                              ) : null}
                            </div>

                            {on && !locked && (
                              <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
                                <span className={UPGRADE_SELECTED_CHECK}>✓</span>
                                <span className={UPGRADE_SELECTED_UNCHECK}>✕</span>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                      })}
                    </div>
                  </div>
                  <UpgradePageStripPagination
                    page={inventoryPageClamped}
                    totalPages={inventoryTotalPages}
                    disabled={spinning}
                    onPageChange={setInventoryPage}
                  />
                </div>
              ) : (
                <div className="flex min-h-0 flex-col">
                  <div className="max-h-[min(42vh,440px)] min-h-[260px] overflow-hidden sm:min-h-[300px] sm:max-h-[480px]">
                    <div className="space-y-1">
                      {inventoryPageSlice.map((it) => {
                    const on = selected.has(it.itemId);
                    const locked = Boolean(it.withdrawalPending);
                    const chipRub = effectiveInvPriceRub(it);
                    return (
                      <button
                        key={it.itemId}
                        type="button"
                        title={locked ? "Предмет на выводе" : undefined}
                        disabled={spinning || locked}
                        onClick={() => toggleSel(it.itemId)}
                        className={`group flex w-full items-center gap-3 rounded-xl border px-2 py-2 text-left transition ${rarityCardSurface(it.rarity || "common")} ${
                          on ? "ring-2 ring-cb-flame/55 shadow-[0_0_12px_rgba(255,49,49,0.2)]" : "hover:brightness-105"
                        } disabled:pointer-events-none disabled:opacity-45`}
                      >
                        <div className="relative h-12 w-14 shrink-0 overflow-hidden rounded-md bg-black/25">
                          {it.image ? (
                            <Image
                              src={preferHighResSteamEconomyImage(it.image) ?? it.image}
                              alt=""
                              fill
                              className={`relative z-0 object-contain p-0.5 ${SKIN_IMG_QUALITY_CLASS}`}
                              quality={100}
                              unoptimized
                            />
                          ) : null}
                          {on && !locked ? <div aria-hidden className={UPGRADE_GRID_SELECTED_OVERLAY} /> : null}

                          {on && !locked && (
                            <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
                              <span className={UPGRADE_SELECTED_CHECK_SM}>✓</span>
                              <span className={UPGRADE_SELECTED_UNCHECK_SM}>✕</span>
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 flex-1 truncate text-[11px] text-zinc-100">{it.name}</p>
                            <span className={`shrink-0 ${UPGRADE_SKIN_PRICE_TAG_ROW}`}>
                              <span className={`min-w-0 ${UPGRADE_SKIN_PRICE_NUM_ROW}`}>{formatRubSpaced(chipRub)}</span>
                              <RoundedZapIcon className="h-[10px] w-[10px] shrink-0 text-emerald-100 sm:h-[11px] sm:w-[11px]" />
                            </span>
                          </div>
                          {locked ? (
                            <span className="text-[8px] font-bold uppercase text-amber-500/90">
                              на выводе
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                      })}
                    </div>
                  </div>
                  <UpgradePageStripPagination
                    page={inventoryPageClamped}
                    totalPages={inventoryTotalPages}
                    disabled={spinning}
                    onPageChange={setInventoryPage}
                  />
                </div>
              )}
            </div>

            <div className={`${panelClass} flex flex-col p-4`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[13px] font-bold text-white">
                    {useServerEligible ? "Подходящие скины" : "Выберите предмет"}{" "}
                    <span className="font-normal text-zinc-500">({validTargets.length} шт.)</span>
                  </h3>
                  {useServerEligible ? (
                    <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">
                      Только цели, где шанс в допустимых пределах для вашего взноса
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-cb-stroke/80 bg-black/50 p-0.5">
                  <button
                    type="button"
                    disabled={spinning}
                    onClick={() => setGridView(true)}
                    className={`rounded-md px-2 py-1 text-[11px] disabled:opacity-40 ${gridView ? "bg-red-600/30 text-cb-flame" : "text-zinc-500"}`}
                  >
                    ▦
                  </button>
                  <button
                    type="button"
                    disabled={spinning}
                    onClick={() => setGridView(false)}
                    className={`rounded-md px-2 py-1 text-[11px] disabled:opacity-40 ${!gridView ? "bg-red-600/30 text-cb-flame" : "text-zinc-500"}`}
                  >
                    ☰
                  </button>
                </div>
              </div>
              <div className="mb-3 flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
                  Цена от
                  <input
                    type="number"
                    min={0}
                    value={priceMin}
                    disabled={spinning}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder={SITE_CURRENCY_CODE}
                    className="w-24 rounded-lg border border-cb-stroke bg-black/50 px-2 py-1.5 text-[12px] text-white disabled:cursor-not-allowed disabled:opacity-45"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wider text-zinc-500">
                  до
                  <input
                    type="number"
                    min={0}
                    value={priceMax}
                    disabled={spinning}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder={SITE_CURRENCY_CODE}
                    className="w-24 rounded-lg border border-cb-stroke bg-black/50 px-2 py-1.5 text-[12px] text-white disabled:cursor-not-allowed disabled:opacity-45"
                  />
                </label>
                <div className="flex flex-1 flex-col gap-1 sm:min-w-[140px]">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">Поиск</span>
                  <div className="flex rounded-lg border border-cb-stroke bg-black/50">
                    <input
                      value={search}
                      disabled={spinning}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Название…"
                      className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[12px] text-white placeholder:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-45"
                    />
                    <span className="flex items-center px-2 text-zinc-500">⌕</span>
                  </div>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="max-h-[min(42vh,440px)] min-h-[220px] flex-1 overflow-hidden rounded-xl border border-cb-stroke/70 bg-black/35 p-2 sm:min-h-[260px] sm:max-h-[480px]">
                {validTargets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                    {eligibleLoading && useServerEligible ? (
                      <>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Загрузка подходящих скинов…
                        </p>
                        <p className="text-[10px] text-zinc-600">Сервер отфильтровывает цели по правилам шанса</p>
                      </>
                    ) : useServerEligible && eligibleItems !== null && eligibleItems.length === 0 ? (
                      <>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          Нет целей с подходящим шансом
                        </p>
                        <p className="text-[10px] text-zinc-600">
                          Увеличьте взнос или выберите дороже цель в каталоге (в пределах лимита шанса)
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          Используйте поиск или фильтр цены
                        </p>
                        <p className="text-[10px] text-zinc-600">Нет целей дороже взноса</p>
                      </>
                    )}
                  </div>
                ) : gridView ? (
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {targetsPageSlice.map((t) => {
                      const selected = targetId === t.id;
                      const rk = resolveUpgradeRarityKey(t.rarity);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          disabled={spinning}
                          onClick={() => {
                            const nextId = selected ? "" : t.id;
                            playUpgradeChipClick(getRouletteSoundMuted());
                            userClearedTargetRef.current = nextId === "";
                            setTargetId(nextId);
                            setShowResult(null);
                            setLastRoll(null);
                            setServerPWin(null);
                            setGaugeHoldDisplayPct(null);
                          }}
                          className={`group relative overflow-hidden rounded-lg border text-left transition ${rarityCardSurfaceUpgradeGrid(t.rarity)} ${
                            selected
                              ? "ring-2 ring-cb-flame/70 ring-offset-2 ring-offset-[#070708]"
                              : "hover:brightness-110"
                          } disabled:pointer-events-none disabled:opacity-45`}
                        >
                          <div className="relative aspect-square w-full">
                            <div
                              aria-hidden
                              className={`pointer-events-none absolute left-1/2 top-[44%] z-0 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl opacity-100 saturate-125 ${RARITY_UPGRADE_IMAGE_GLOW[rk] || RARITY_UPGRADE_IMAGE_GLOW.common}`}
                            />
                            {t.image ? (
                              <Image
                                src={preferHighResSteamEconomyImage(t.image) ?? t.image}
                                alt=""
                                fill
                                className={`pointer-events-none z-[1] object-contain p-1.5 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] ${SKIN_IMG_QUALITY_CLASS}`}
                                quality={100}
                                unoptimized
                              />
                            ) : (
                              <div className="pointer-events-none relative z-[1] flex h-full items-center justify-center text-[10px] text-zinc-600">
                                ?
                              </div>
                            )}

                            {selected ? <div aria-hidden className={UPGRADE_GRID_SELECTED_OVERLAY} /> : null}

                            <div
                              className={`pointer-events-none absolute right-1 top-1 z-[2] ${UPGRADE_SKIN_PRICE_TAG_GRID}`}
                              aria-label={formatSiteAmountSpaced(t.price)}
                            >
                              <span className={`min-w-0 ${UPGRADE_SKIN_PRICE_NUM}`}>{formatRubSpaced(t.price)}</span>
                              <RoundedZapIcon className="h-[10px] w-[10px] shrink-0 text-emerald-100 sm:h-[11px] sm:w-[11px]" />
                            </div>

                            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex flex-col gap-0.5 px-1.5 pb-1.5 pt-3">
                              <p className="line-clamp-2 text-[8px] font-medium leading-tight text-zinc-100 sm:text-[9px]">
                                {t.name}
                              </p>
                            </div>

                            {selected && (
                              <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
                                <span className={UPGRADE_SELECTED_CHECK} aria-hidden>
                                  ✓
                                </span>
                                <span className={UPGRADE_SELECTED_UNCHECK} aria-hidden>
                                  ✕
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {targetsPageSlice.map((t) => {
                      const selected = targetId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          disabled={spinning}
                          onClick={() => {
                            const nextId = selected ? "" : t.id;
                            playUpgradeChipClick(getRouletteSoundMuted());
                            userClearedTargetRef.current = nextId === "";
                            setTargetId(nextId);
                            setShowResult(null);
                            setLastRoll(null);
                            setServerPWin(null);
                            setGaugeHoldDisplayPct(null);
                          }}
                          className={`group flex w-full items-center gap-3 rounded-xl border px-2 py-2 text-left transition ${rarityCardSurface(t.rarity)} ${
                            selected
                              ? "ring-2 ring-cb-flame/55 shadow-[0_0_12px_rgba(255,49,49,0.2)]"
                              : "hover:brightness-105"
                          } disabled:pointer-events-none disabled:opacity-45`}
                        >
                          <div className="relative h-12 w-14 shrink-0 overflow-hidden rounded-md bg-black/25">
                            {t.image ? (
                              <Image
                                src={preferHighResSteamEconomyImage(t.image) ?? t.image}
                                alt=""
                                fill
                                className={`relative z-0 object-contain p-0.5 ${SKIN_IMG_QUALITY_CLASS}`}
                                quality={100}
                                unoptimized
                              />
                            ) : (
                              <span className="relative z-0 flex h-full items-center justify-center text-[10px] text-zinc-600">
                                ?
                              </span>
                            )}

                            {selected ? <div aria-hidden className={UPGRADE_GRID_SELECTED_OVERLAY} /> : null}

                            {selected && (
                              <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
                                <span className={UPGRADE_SELECTED_CHECK_SM}>✓</span>
                                <span className={UPGRADE_SELECTED_UNCHECK_SM}>✕</span>
                              </div>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-zinc-100">
                                {t.name}
                              </p>
                              <span className={`shrink-0 ${UPGRADE_SKIN_PRICE_TAG_ROW}`}>
                                <span className={`min-w-0 ${UPGRADE_SKIN_PRICE_NUM_ROW}`}>{formatRubSpaced(t.price)}</span>
                                <RoundedZapIcon className="h-[10px] w-[10px] shrink-0 text-emerald-100 sm:h-[11px] sm:w-[11px]" />
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                </div>
                {validTargets.length > 0 ? (
                  <UpgradePageStripPagination
                    page={targetsPageClamped}
                    totalPages={targetsTotalPages}
                    disabled={spinning || eligibleLoading}
                    onPageChange={setTargetsPage}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
