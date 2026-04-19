"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { normRarity, rarityBar, rarityCardFill } from "@/components/CaseRoulette";
import { FreeKassaBanner } from "@/components/FreeKassaBanner";
import { SiteShell } from "@/components/SiteShell";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import { requestAuthModal } from "@/lib/authModal";
import { RoundedZapIcon } from "@/components/icons/RoundedZapIcon";
import { SiteMoney } from "@/components/SiteMoney";
import { SitePriceBadge } from "@/components/SitePriceBadge";
import { formatSiteAmount } from "@/lib/money";
import { SITE_MONEY_CTA_CLASS } from "@/lib/siteMoneyStyles";
import { preferHighResSteamEconomyImage, SKIN_IMG_QUALITY_CLASS } from "@/lib/steamImage";

function splitItemName(item: string): { weapon: string; skin: string } {
  const t = item.trim();
  const idx = t.indexOf("|");
  if (idx === -1) return { weapon: t, skin: "" };
  return {
    weapon: t.slice(0, idx).trim(),
    skin: t.slice(idx + 1).trim(),
  };
}

const RANK_STEPS = [
  "BRONZE I",
  "BRONZE II",
  "BRONZE III",
  "SILVER I",
  "SILVER II",
  "GOLD I",
  "GOLD II",
  "PLATINUM",
  "STORM",
] as const;

function profileRankFromStats(
  st?: { casesOpened?: number; upgradesDone?: number; itemsSold?: number },
) {
  const cases = st?.casesOpened ?? 0;
  const upg = st?.upgradesDone ?? 0;
  const sold = st?.itemsSold ?? 0;
  const xp = cases * 12 + upg * 20 + sold * 6;
  const level = Math.min(99, Math.max(1, 1 + Math.floor(xp / 450)));
  const inSegment = xp % 450;
  const rankStep = Math.min(RANK_STEPS.length - 1, Math.floor(xp / 900));
  const label = RANK_STEPS[rankStep];
  return {
    level,
    label,
    rankStep,
    xpInSegment: inSegment,
    xpSegment: 450,
    xpTotal: xp,
  };
}

type ProfileTab =
  | "inventory"
  | "missions"
  | "deposit"
  | "partner"
  | "support"
  | "history"
  | "settings";

const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: "inventory", label: "Инвентарь" },
  { id: "missions", label: "Миссии" },
  { id: "deposit", label: "Пополнить" },
  { id: "partner", label: "Партнёрка" },
  { id: "support", label: "Поддержка" },
  { id: "history", label: "История" },
  { id: "settings", label: "Настройки" },
];

function ProfileTabNavIcon({ id, className }: { id: ProfileTab; className?: string }) {
  const cn = `h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4 ${className ?? ""}`.trim();
  const stroke = 2;
  switch (id) {
    case "inventory":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case "missions":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4" />
        </svg>
      );
    case "deposit":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "partner":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case "support":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case "history":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "settings":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    default:
      return null;
  }
}

const INV_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "priceDesc", label: "Цена: выше" },
  { value: "priceAsc", label: "Цена: ниже" },
  { value: "name", label: "По названию" },
];

type Me = {
  steamId?: string;
  displayName: string;
  avatar: string;
  balance: number;
  isAdmin?: boolean;
  isSupportStaff?: boolean;
  stats?: {
    casesOpened: number;
    upgradesDone: number;
    itemsSold: number;
    soldTotalRub: number;
  };
  inventory: {
    itemId: string;
    name: string;
    image: string;
    rarity: string;
    sellPrice: number;
    marketPriceRub?: number | null;
    priceSource?: string;
    withdrawalPending?: boolean;
    caseSlug?: string;
    dmarketAssetId?: string;
    dmarketClassId?: string;
    dmarketGameId?: string;
    dmarketTitle?: string;
    exterior?: string;
  }[];
  bestEverItem?: {
    name: string;
    image: string | null;
    rarity: string;
    sellPrice: number;
    source?: "case" | "upgrade" | "inventory";
  };
};

type BestDrop = {
  name: string;
  image: string | null;
  rarity: string;
  sellPrice: number;
  source?: "case" | "upgrade" | "inventory";
};

type MyWithdrawalRow = {
  id: string;
  status: string;
  itemSnapshot?: { itemId?: string };
};

const rarityClass: Record<string, string> = {
  common: "border-zinc-600/80 bg-zinc-950/50 text-zinc-300",
  uncommon: "border-sky-400/50 bg-sky-950/25 text-sky-200",
  rare: "border-blue-600/50 bg-blue-950/25 text-blue-300",
  epic: "border-purple-600/50 bg-purple-950/25 text-purple-300",
  legendary: "border-orange-500/50 bg-red-950/30 text-orange-300",
  consumer: "border-zinc-500/60 bg-zinc-950/45 text-zinc-300",
  industrial: "border-slate-500/50 bg-slate-950/30 text-slate-300",
  milspec: "border-blue-600/50 bg-blue-950/25 text-blue-300",
  "mil-spec": "border-blue-600/50 bg-blue-950/25 text-blue-300",
  restricted: "border-violet-600/50 bg-violet-950/25 text-violet-200",
  classified: "border-fuchsia-600/50 bg-fuchsia-950/25 text-fuchsia-200",
  covert: "border-red-600/55 bg-red-950/35 text-red-200",
  extraordinary: "border-amber-500/50 bg-amber-950/25 text-amber-200",
  contraband: "border-orange-500/55 bg-orange-950/30 text-orange-200",
};

const profileCard =
  "rounded-2xl border border-cb-stroke/60 bg-gradient-to-br from-[#0a0e14]/95 via-cb-panel/40 to-black/80 shadow-[inset_0_1px_0_rgba(255,49,49,0.07),0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-sm";

function ProfileWalletIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M16 14h2" />
    </svg>
  );
}

function ProfileLogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3m0 0l4-4m-4 4l4 4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5a2 2 0 012-2h9a2 2 0 012 2v14a2 2 0 01-2 2h-9a2 2 0 01-2-2v-2" />
    </svg>
  );
}

/** Іконка рангу за кроком 0…RANK_STEPS.length-1 (відповідає `RANK_STEPS`). */
function ProfileRankIcon({ rankStep, label }: { rankStep: number; label: string }) {
  const s = Math.max(0, Math.min(RANK_STEPS.length - 1, rankStep));
  const common = "h-5 w-5 shrink-0";
  const glyph = (() => {
    if (s <= 2) {
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3l2.2 4.5L19 8.3l-3.5 3.4.8 4.9L12 14.9 7.7 16.6l.8-4.9L5 8.3l4.8-.8L12 3z"
            className="fill-amber-700/90 stroke-amber-500/60"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
    if (s <= 4) {
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3l2.2 4.5L19 8.3l-3.5 3.4.8 4.9L12 14.9 7.7 16.6l.8-4.9L5 8.3l4.8-.8L12 3z"
            className="fill-zinc-400/90 stroke-zinc-300/70"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
    if (s <= 6) {
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3l2.2 4.5L19 8.3l-3.5 3.4.8 4.9L12 14.9 7.7 16.6l.8-4.9L5 8.3l4.8-.8L12 3z"
            className="fill-amber-400/95 stroke-amber-200/80"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
    if (s === 7) {
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 2l2.5 5.5L20 9l-5 3 1.5 6.5L12 15.5 7.5 18.5 9 12 4 9l5.5-1.5L12 2z"
            className="fill-cyan-400/85 stroke-cyan-200/70"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
          className="fill-cb-flame/95 stroke-orange-300/70"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    );
  })();

  const shell =
    s <= 2
      ? "border-amber-800/50 bg-amber-950/50"
      : s <= 4
        ? "border-zinc-500/45 bg-zinc-900/55"
        : s <= 6
          ? "border-amber-500/45 bg-amber-950/35"
          : s === 7
            ? "border-cyan-500/40 bg-cyan-950/35"
            : "border-cb-flame/50 bg-red-950/40";

  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ring-1 ring-black/30 ${shell}`}
      title={label}
    >
      {glyph}
      <span className="sr-only">{label}</span>
    </span>
  );
}

function ProfileSelectChevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const profileFilterTriggerClass =
  "flex h-[2.5rem] w-full shrink-0 items-center justify-between gap-2 rounded-lg border border-cb-stroke/60 bg-black/55 px-2.5 text-left text-[11px] font-semibold text-zinc-200 transition hover:border-cb-flame/35 focus:border-cb-flame/45 focus:outline-none focus:ring-1 focus:ring-cb-flame/25 sm:text-xs";

/** Кастомний список — стилізується лише випадаюча панель (нативний &lt;select&gt; не дає стилів для option). */
function ProfileFilterDropdown({
  value,
  onChange,
  options,
  ariaLabel,
  triggerClassName,
}: {
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelBox, setPanelBox] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const syncPanelPosition = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    const desiredMax = 224;
    const spaceBelow = window.innerHeight - r.bottom - gap - 12;
    const spaceAbove = r.top - gap - 12;
    const openDown = spaceBelow >= 120 || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(
      120,
      Math.min(desiredMax, openDown ? spaceBelow : spaceAbove),
    );
    const top = openDown ? r.bottom + gap : Math.max(8, r.top - gap - maxHeight);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - r.width - 8);
    setPanelBox({ top, left, width: r.width, maxHeight });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelBox(null);
      return;
    }
    syncPanelPosition();
    const onScroll = () => syncPanelPosition();
    const onResize = () => syncPanelPosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, syncPanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value) ?? options[0];

  const panel =
    open && panelBox ? (
      <div
        ref={panelRef}
        role="listbox"
        style={{
          position: "fixed",
          top: panelBox.top,
          left: panelBox.left,
          width: panelBox.width,
          maxHeight: panelBox.maxHeight,
          zIndex: 200,
        }}
        className="overflow-y-auto overflow-x-hidden rounded-xl border border-cb-stroke/80 bg-[#09090d]/98 py-1 shadow-[0_16px_48px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,49,49,0.12),inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-cb-flame/25 backdrop-blur-md"
      >
        {options.map((opt) => (
          <button
            key={opt.value === "" ? "__all" : opt.value}
            type="button"
            role="option"
            aria-selected={value === opt.value}
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
            className={`flex w-full items-center px-3 py-2.5 text-left text-[11px] leading-snug transition sm:text-xs ${
              value === opt.value
                ? "bg-gradient-to-r from-cb-flame/20 to-transparent font-semibold text-cb-flame shadow-[inset_3px_0_0_0_rgba(255,49,49,0.85)]"
                : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={`relative ${triggerClassName ?? ""}`}>
      <button
        type="button"
        className={profileFilterTriggerClass}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0 truncate">{current?.label}</span>
        <ProfileSelectChevron
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

function displayItemRub(it: Me["inventory"][number]): number {
  const m = Number(it.marketPriceRub);
  if (Number.isFinite(m) && m > 0) return m;
  return Number(it.sellPrice) || 0;
}

/** Скільки карток інвентаря на одній сторінці профілю. */
const INVENTORY_ITEMS_PER_PAGE = 12;

type InventoryPageToken = number | "ellipsis";

function buildInventoryPaginationPages(current: number, total: number): InventoryPageToken[] {
  if (total <= 1) return [1];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const delta = 1;
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);
  const out: InventoryPageToken[] = [1];
  if (left > 2) out.push("ellipsis");
  for (let i = left; i <= right; i++) out.push(i);
  if (right < total - 1) out.push("ellipsis");
  out.push(total);
  return out;
}

function InventoryPaginationBar({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const model = buildInventoryPaginationPages(currentPage, totalPages);
  const arrowCls =
    "flex h-9 min-w-9 items-center justify-center rounded-lg border border-cb-stroke/60 bg-zinc-950/80 text-sm font-bold text-zinc-200 transition hover:border-cb-flame/45 hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 sm:h-10 sm:min-w-10";
  const pageCls =
    "min-w-9 rounded-lg border px-2 py-1.5 text-center text-xs font-black tabular-nums transition sm:min-w-10 sm:text-sm";
  const pageIdle = `${pageCls} border-cb-stroke/55 bg-black/45 text-zinc-300 hover:border-cb-flame/40 hover:text-white`;
  const pageActive = `${pageCls} border-cb-flame/55 bg-red-950/35 text-cb-flame shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`;

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5"
      aria-label="Страницы инвентаря"
    >
      <button
        type="button"
        className={arrowCls}
        disabled={currentPage <= 1}
        aria-label="Предыдущая страница"
        onClick={() => onPageChange(currentPage - 1)}
      >
        &lt;
      </button>
      {model.map((token, idx) =>
        token === "ellipsis" ? (
          <span
            key={`e-${idx}`}
            className="flex h-9 min-w-8 items-center justify-center text-sm font-bold text-zinc-500 sm:h-10"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={token}
            type="button"
            className={token === currentPage ? pageActive : pageIdle}
            aria-label={`Страница ${token}`}
            aria-current={token === currentPage ? "page" : undefined}
            onClick={() => onPageChange(token)}
          >
            {token}
          </button>
        ),
      )}
      <button
        type="button"
        className={arrowCls}
        disabled={currentPage >= totalPages}
        aria-label="Следующая страница"
        onClick={() => onPageChange(currentPage + 1)}
      >
        &gt;
      </button>
    </nav>
  );
}

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [sellAllBusy, setSellAllBusy] = useState(false);
  const [depositNotice, setDepositNotice] = useState<string | null>(null);
  const [tradeUrl, setTradeUrl] = useState("");
  const [tradeSavedFlash, setTradeSavedFlash] = useState(false);
  const [withdrawItem, setWithdrawItem] = useState<Me["inventory"][number] | null>(null);
  const [withdrawTradeUrl, setWithdrawTradeUrl] = useState("");
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawErr, setWithdrawErr] = useState<string | null>(null);
  const [myWithdrawals, setMyWithdrawals] = useState<MyWithdrawalRow[]>([]);
  const [cancelWithdrawBusyId, setCancelWithdrawBusyId] = useState<string | null>(null);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [profileTab, setProfileTab] = useState<ProfileTab>("inventory");
  const [invWeapon, setInvWeapon] = useState("");
  const [invSort, setInvSort] = useState<"priceDesc" | "priceAsc" | "name">("priceDesc");
  const [invSearch, setInvSearch] = useState("");
  const [invActiveOnly, setInvActiveOnly] = useState(false);

  /** Активні заявки з /api/withdrawals/mine — єдине джерело для «На выводе» / «Отменить», щоб не розходилось з /api/me. */
  const activeWithdrawalByItemId = useMemo(() => {
    const ACTIVE = new Set(["pending", "processing", "failed"]);
    const m = new Map<string, { status: string; id: string }>();
    for (const w of myWithdrawals) {
      const st = String(w.status || "").trim().toLowerCase();
      if (!ACTIVE.has(st)) continue;
      const iid = String(w.itemSnapshot?.itemId ?? "").trim();
      if (iid) m.set(iid, { status: st, id: w.id });
    }
    return m;
  }, [myWithdrawals]);

  const inventorySellTotal = useMemo(
    () =>
      (me?.inventory ?? []).reduce((s, it) => {
        if (activeWithdrawalByItemId.has(String(it.itemId ?? "").trim())) return s;
        return s + displayItemRub(it);
      }, 0),
    [me?.inventory, activeWithdrawalByItemId],
  );

  const sellableInventoryCount = useMemo(
    () =>
      (me?.inventory ?? []).filter((it) => !activeWithdrawalByItemId.has(String(it.itemId ?? "").trim()))
        .length,
    [me?.inventory, activeWithdrawalByItemId],
  );

  const weaponTypeOptions = useMemo(() => {
    const inv = me?.inventory ?? [];
    const s = new Set<string>();
    for (const it of inv) {
      const w = splitItemName(it.name).weapon.trim();
      if (w) s.add(w);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "ru"));
  }, [me?.inventory]);

  const invWeaponDropdownOptions = useMemo(
    () => [{ value: "", label: "Все типы" }, ...weaponTypeOptions.map((w) => ({ value: w, label: w }))],
    [weaponTypeOptions],
  );

  const filteredInventory = useMemo(() => {
    const inv = me?.inventory ?? [];
    let rows = inv.slice();
    if (invActiveOnly) {
      rows = rows.filter((it) => !activeWithdrawalByItemId.has(String(it.itemId ?? "").trim()));
    }
    if (invWeapon) {
      const lw = invWeapon.toLowerCase();
      rows = rows.filter((it) => splitItemName(it.name).weapon.toLowerCase() === lw);
    }
    const q = invSearch.trim().toLowerCase();
    if (q) rows = rows.filter((it) => it.name.toLowerCase().includes(q));
    rows.sort((a, b) => {
      const pa = displayItemRub(a);
      const pb = displayItemRub(b);
      if (invSort === "priceDesc") return pb - pa;
      if (invSort === "priceAsc") return pa - pb;
      return a.name.localeCompare(b.name, "ru");
    });
    return rows;
  }, [me?.inventory, invActiveOnly, invWeapon, invSearch, invSort, activeWithdrawalByItemId]);

  const inventoryTotalPages = useMemo(() => {
    const n = filteredInventory.length;
    if (n <= 0) return 1;
    return Math.max(1, Math.ceil(n / INVENTORY_ITEMS_PER_PAGE));
  }, [filteredInventory.length]);

  const safeInventoryPage = Math.min(Math.max(1, inventoryPage), inventoryTotalPages);

  const inventoryPageItems = useMemo(() => {
    if (!filteredInventory.length) return [];
    const start = (safeInventoryPage - 1) * INVENTORY_ITEMS_PER_PAGE;
    return filteredInventory.slice(start, start + INVENTORY_ITEMS_PER_PAGE);
  }, [filteredInventory, safeInventoryPage]);

  useEffect(() => {
    setInventoryPage(1);
  }, [invWeapon, invSearch, invSort, invActiveOnly]);

  useEffect(() => {
    setInventoryPage((p) => Math.max(1, Math.min(p, inventoryTotalPages)));
  }, [inventoryTotalPages]);

  const goInventoryPage = useCallback((p: number) => {
    setInventoryPage((prev) => {
      const next = Math.max(1, Math.min(p, inventoryTotalPages));
      if (next !== prev && typeof document !== "undefined") {
        requestAnimationFrame(() => {
          document.getElementById("inventory")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      return next;
    });
  }, [inventoryTotalPages]);

  const load = useCallback(async () => {
    if (!getToken()) {
      setMe(null);
      setErr(null);
      setMyWithdrawals([]);
      return;
    }
    const [rMe, rWd] = await Promise.all([
      apiFetch<Me>("/api/me"),
      apiFetch<{ withdrawals: MyWithdrawalRow[] }>("/api/withdrawals/mine"),
    ]);
    if (!rMe.ok) {
      setErr(rMe.error || "Ошибка");
      setMe(null);
      setMyWithdrawals([]);
      return;
    }
    setErr(null);
    setMe(rMe.data!);
    setMyWithdrawals(Array.isArray(rWd.data?.withdrawals) ? rWd.data!.withdrawals : []);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cd-withdrawals-mine-changed"));
    }
  }, []);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setTradeUrl(localStorage.getItem("cd_trade_url") || "");
  }, [me?.steamId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const h = () => load();
    window.addEventListener("cd-balance-updated", h);
    return () => window.removeEventListener("cd-balance-updated", h);
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    const q = new URLSearchParams(window.location.search);
    const d = q.get("deposit");
    if (d === "success") {
      window.dispatchEvent(new CustomEvent("cd-balance-updated"));
      window.history.replaceState({}, "", "/profile");
      setProfileTab("deposit");
      setDepositNotice("После успешной оплаты баланс обновится автоматически (обычно в течение нескольких минут).");
    } else if (d === "cancel") {
      window.history.replaceState({}, "", "/profile");
      setProfileTab("deposit");
      setDepositNotice("Оплата отменена.");
    }
  }, [hydrated]);

  const bestDrop: BestDrop | null = me
    ? me.bestEverItem
      ? {
          name: me.bestEverItem.name,
          image: me.bestEverItem.image ?? null,
          rarity: me.bestEverItem.rarity,
          sellPrice: me.bestEverItem.sellPrice,
          source: me.bestEverItem.source,
        }
      : me.inventory.reduce<BestDrop | null>(
          (acc, it) => {
            const p = displayItemRub(it);
            const current = acc?.sellPrice ?? -Infinity;
            return p > current
              ? {
                  name: it.name,
                  image: it.image ?? null,
                  rarity: it.rarity,
                  sellPrice: p,
                  source: "inventory",
                }
              : acc;
          },
          null,
        )
    : null;

  const rankInfo = useMemo(() => profileRankFromStats(me?.stats), [me?.stats]);

  const fullInventoryScValue = useMemo(
    () => (me?.inventory ?? []).reduce((s, it) => s + displayItemRub(it), 0),
    [me?.inventory],
  );

  const accountStats = useMemo(
    () =>
      me?.stats ?? {
        casesOpened: 0,
        upgradesDone: 0,
        itemsSold: 0,
        soldTotalRub: 0,
      },
    [me?.stats],
  );

  async function applyPromo() {
    const c = promoCode.trim();
    if (!c) {
      setPromoMsg("Введите промокод");
      return;
    }
    if (!getToken()) {
      requestAuthModal("/profile");
      return;
    }
    setPromoBusy(true);
    setPromoMsg(null);
    const r = await apiFetch<{
      granted?: number;
      newBalance?: number;
      depositPercent?: number;
      error?: string;
    }>(
      "/api/promo/redeem",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }),
      }
    );
    setPromoBusy(false);
    if (!r.ok) {
      setPromoMsg(r.error || "Не удалось применить");
      return;
    }
    if (typeof r.data?.depositPercent === "number") {
      setPromoMsg(`+${r.data.depositPercent}% к депозиту`);
    } else {
      setPromoMsg(`Начислено ${formatSiteAmount(r.data?.granted ?? 0)}`);
    }
    setPromoCode("");
    await load();
    window.dispatchEvent(new CustomEvent("cd-balance-updated"));
  }

  async function sell(itemId: string) {
    if (!getToken()) {
      requestAuthModal("/profile");
      return;
    }
    const r = await apiFetch<{ newBalance: number }>("/api/inventory/sell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    if (!r.ok) {
      alert(r.error);
      return;
    }
    await load();
    window.dispatchEvent(new CustomEvent("cd-balance-updated"));
  }

  async function sellAll() {
    if (!getToken()) {
      requestAuthModal("/profile");
      return;
    }
    if (!me?.inventory.length || sellAllBusy) return;
    setSellAllBusy(true);
    const r = await apiFetch<{ newBalance: number; totalSold: number; count: number }>(
      "/api/inventory/sell-all",
      { method: "POST" },
    );
    setSellAllBusy(false);
    if (!r.ok) {
      alert(r.error || "Не удалось продать");
      return;
    }
    await load();
    window.dispatchEvent(new CustomEvent("cd-balance-updated"));
  }

  function saveTradeUrl() {
    if (typeof window === "undefined") return;
    localStorage.setItem("cd_trade_url", tradeUrl.trim());
    setTradeSavedFlash(true);
    window.setTimeout(() => setTradeSavedFlash(false), 2500);
  }

  function logoutProfile() {
    clearToken();
    window.location.href = "/";
  }

  function openTopUp() {
    window.dispatchEvent(new CustomEvent("cd-open-crypto-topup"));
  }

  async function submitWithdraw() {
    if (!withdrawItem || withdrawBusy) return;
    if (!getToken()) {
      requestAuthModal("/profile");
      return;
    }
    const u = withdrawTradeUrl.trim();
    const low = u.toLowerCase();
    if (
      u.length < 40 ||
      !low.includes("steamcommunity.com") ||
      (!low.includes("tradeoffer/new") && (!low.includes("partner=") || !low.includes("token=")))
    ) {
      setWithdrawErr("Укажите полную Steam trade-ссылку (partner и token)");
      return;
    }
    setWithdrawBusy(true);
    setWithdrawErr(null);
    const r = await apiFetch<{ withdrawal?: { id: string } }>("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: withdrawItem.itemId, tradeUrl: u }),
    });
    setWithdrawBusy(false);
    if (!r.ok) {
      setWithdrawErr(r.error || "Ошибка");
      return;
    }
    setWithdrawItem(null);
    await load();
    alert("Заявка на вывод создана. Админ подтвердит покупку на Market.csgo и отправку на ваш trade URL.");
  }

  async function cancelMyWithdraw(withdrawalId: string) {
    if (!getToken() || cancelWithdrawBusyId) return;
    if (
      !window.confirm(
        "Отменить заявку на вывод? Предмет снова можно продать или подать заявку заново.",
      )
    ) {
      return;
    }
    setCancelWithdrawBusyId(withdrawalId);
    const r = await apiFetch(`/api/withdrawals/${encodeURIComponent(withdrawalId)}/cancel`, {
      method: "POST",
    });
    setCancelWithdrawBusyId(null);
    if (!r.ok) {
      alert(r.error || "Не удалось отменить");
      return;
    }
    await load();
    window.dispatchEvent(new CustomEvent("cd-balance-updated"));
  }

  const tradeUrlOk = tradeUrl.trim().length > 20;
  const rankXpPct = Math.min(
    100,
    (rankInfo.xpInSegment / Math.max(1, rankInfo.xpSegment)) * 100,
  );
  const rankXpToNext = Math.max(0, rankInfo.xpSegment - rankInfo.xpInSegment);

  return (
    <SiteShell>
      <div className="relative mx-auto w-full max-w-[min(96rem,calc(100vw-1.5rem))] px-4 pb-20 pt-8 sm:px-6 sm:pb-24 sm:pt-10 lg:px-12">
            {hydrated && !getToken() && (
              <div className="mb-8 rounded-2xl border border-violet-500/30 bg-violet-950/20 px-5 py-6 text-center text-sm text-zinc-300 sm:text-left">
                Войдите через Steam в шапке, чтобы видеть баланс, промокоды и инвентарь.
              </div>
            )}

            {err && (
              <p className="mb-6 rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                {err}
              </p>
            )}

            {depositNotice && (
              <p className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200/95">
                {depositNotice}
              </p>
            )}

            {me && (
              <>
                <div className={`${profileCard} relative mb-8 overflow-hidden p-5 sm:p-6 lg:p-7`}>
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                      <div className="flex shrink-0 justify-center sm:justify-start">
                        <div className="relative w-28 overflow-hidden rounded-2xl ring-2 ring-cb-flame/40 sm:w-32 xl:w-36">
                          {me.avatar ? (
                            <Image
                              src={me.avatar}
                              alt=""
                              width={144}
                              height={144}
                              className="aspect-square h-auto w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex aspect-square w-full items-center justify-center bg-zinc-900 text-3xl text-zinc-600">
                              ?
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-2 pb-2 pt-8 text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/95">
                              {rankInfo.level} уровень
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-3 sm:space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h2 className="truncate text-xl font-black text-white sm:text-2xl">{me.displayName}</h2>
                            {me.steamId ? (
                              <a
                                href={`https://steamcommunity.com/profiles/${encodeURIComponent(me.steamId)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-cb-stroke/60 bg-black/45 transition hover:border-sky-500/50 hover:bg-sky-950/20"
                                aria-label="Профиль в Steam"
                                title="Профиль в Steam"
                              >
                                <Image
                                  src="/brand/steam-mark.png"
                                  alt=""
                                  width={26}
                                  height={26}
                                  className="h-[1.35rem] w-[1.35rem] object-contain"
                                  unoptimized
                                />
                              </a>
                            ) : null}
                            <button
                              type="button"
                              onClick={logoutProfile}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cb-stroke/60 bg-black/45 text-zinc-500 transition hover:border-red-500/35 hover:text-red-400"
                              aria-label="Выйти"
                              title="Выйти"
                            >
                              <ProfileLogoutIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex shrink-0 flex-row items-center justify-end gap-1.5">
                            {me.isSupportStaff && !me.isAdmin ? (
                              <Link
                                href="/admin/support"
                                className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition hover:text-sky-300"
                              >
                                Поддержка
                              </Link>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <ProfileRankIcon rankStep={rankInfo.rankStep} label={rankInfo.label} />
                          <span className="text-[11px] text-zinc-500">
                            XP:{" "}
                            <span className="font-mono text-zinc-400">{rankInfo.xpTotal}</span>
                          </span>
                          <span className="text-[11px] text-zinc-600">
                            Предметов:{" "}
                            <span className="font-mono font-semibold text-zinc-400">{me.inventory.length}</span>
                          </span>
                        </div>
                        <div>
                          <div className="h-2 overflow-hidden rounded-full bg-black/55 ring-1 ring-cb-stroke/45">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cb-flame via-orange-500 to-amber-400 transition-[width] duration-500"
                              style={{ width: `${rankXpPct}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-[11px] text-zinc-500">
                            До следующего ранга:{" "}
                            <span className="font-mono text-zinc-300">{rankXpToNext} XP</span>
                          </p>
                        </div>
                        {me.steamId ? (
                          <Link
                            href={`/user/${encodeURIComponent(me.steamId)}`}
                            className="inline-flex w-fit items-center justify-center rounded-xl border border-cb-stroke/55 bg-black/35 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-300 shadow-inner ring-1 ring-black/25 transition hover:border-cb-flame/35 hover:bg-black/50 hover:text-zinc-100 sm:text-[11px]"
                          >
                            Публичный профиль
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    <div className="min-w-0 w-full flex-1 space-y-3 lg:min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                          Steam trade URL
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase ${tradeUrlOk ? "text-emerald-400/90" : "text-zinc-600"}`}
                        >
                          {tradeUrlOk ? "OK" : "Нет"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={tradeUrl}
                          onChange={(e) => setTradeUrl(e.target.value)}
                          placeholder="https://steamcommunity.com/tradeoffer/new/?partner=…"
                          className="min-h-[2.75rem] flex-1 rounded-xl border border-cb-stroke/70 bg-black/45 px-3 py-2 font-mono text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:border-cb-flame/50 focus:outline-none focus:ring-1 focus:ring-cb-flame/30 sm:text-xs"
                        />
                        <button
                          type="button"
                          onClick={saveTradeUrl}
                          className="shrink-0 rounded-xl border border-cb-stroke/70 bg-zinc-900/90 px-3 py-2 text-sm font-bold text-zinc-200 transition hover:border-cb-flame/45 hover:text-white"
                          title="Сохранить в браузере"
                        >
                          ✓
                        </button>
                      </div>
                      <p className="text-[10px] leading-relaxed sm:text-[11px]">
                        <a
                          href="https://steamcommunity.com/my/tradeoffers/privacy#trade_url"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold uppercase tracking-wide transition hover:opacity-90"
                        >
                          <span className="text-red-500">(Нажмите здесь!)</span>
                          <span className="text-zinc-500"> чтобы найти свой Steam trade URL</span>
                        </a>
                      </p>
                      {tradeSavedFlash ? (
                        <p className="text-[11px] font-semibold text-emerald-400/95">Сохранено</p>
                      ) : null}

                      <div className="grid w-full grid-cols-1 gap-2 border-t border-cb-stroke/35 pt-3 sm:grid-cols-2 sm:gap-3">
                        <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-cb-stroke/55 bg-black/40 px-3 py-2.5 shadow-inner">
                          <ProfileWalletIcon className="h-5 w-5 shrink-0 text-cb-flame" />
                          <div className="min-w-0">
                            <p className="truncate font-mono text-sm font-black leading-tight text-cb-flame">
                              <SiteMoney
                                value={me.balance}
                                className="text-cb-flame"
                                iconClassName="h-4 w-4 shrink-0 text-cb-flame"
                              />
                            </p>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Баланс</p>
                          </div>
                        </div>
                        <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-cb-stroke/55 bg-black/40 px-3 py-2.5 shadow-inner">
                          <span className="shrink-0 text-base text-emerald-400/90" aria-hidden>
                            ◎
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-mono text-sm font-black leading-tight text-emerald-300/95">
                              {formatSiteAmount(fullInventoryScValue)}
                            </p>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                              Сумма инвентаря
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <nav
                  className="-mx-1 mb-6 flex gap-0.5 overflow-x-auto border-b border-cb-stroke/45 pb-px sm:gap-1"
                  aria-label="Разделы профиля"
                >
                  {PROFILE_TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setProfileTab(t.id)}
                      className={`relative inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[10px] font-black uppercase tracking-wider transition sm:gap-2 sm:px-4 sm:text-[11px] ${
                        profileTab === t.id
                          ? "border-cb-flame text-cb-flame"
                          : "border-transparent text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <ProfileTabNavIcon id={t.id} />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </nav>

                {profileTab === "missions" && (
                  <div className={`${profileCard} mb-10 p-8 text-center`}>
                    <p className="text-sm font-semibold text-zinc-300">Миссии и задания</p>
                    <p className="mt-2 text-sm text-zinc-500">Раздел в разработке — следите за обновлениями.</p>
                  </div>
                )}

                {profileTab === "partner" && (
                  <div className={`${profileCard} mb-10 space-y-4 p-8`}>
                    <p className="text-sm text-zinc-400">Партнёрская программа и реферальные ссылки.</p>
                    <Link
                      href="/partner"
                      className={`${SITE_MONEY_CTA_CLASS} inline-flex px-6 py-3 text-sm font-black uppercase tracking-wider`}
                    >
                      Открыть партнёрку
                    </Link>
                  </div>
                )}

                {profileTab === "support" && (
                  <div className={`${profileCard} mb-10 space-y-4 p-8`}>
                    <p className="text-sm text-zinc-400">Обращения и ответы поддержки.</p>
                    <Link
                      href="/support"
                      className="inline-flex rounded-xl border-2 border-sky-500/50 bg-sky-950/30 px-6 py-3 text-sm font-black uppercase tracking-wider text-sky-200 transition hover:border-sky-400 hover:bg-sky-900/40"
                    >
                      Поддержка
                    </Link>
                  </div>
                )}

                {profileTab === "history" && (
                  <div className="mb-10 space-y-6">
                    <div className={`${profileCard} p-5 sm:p-6`}>
                      <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-white">
                        <span className="text-cb-flame" aria-hidden>
                          ▤
                        </span>
                        Статистика аккаунта
                      </h2>
                      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl border border-cb-stroke/50 bg-black/30 py-3">
                          <p className="mt-1 font-mono text-lg font-black text-cb-flame">{accountStats.casesOpened}</p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Кейсы</p>
                        </div>
                        <div className="rounded-xl border border-cb-stroke/50 bg-black/30 py-3">
                          <p className="mt-1 font-mono text-lg font-black text-cb-flame">{accountStats.upgradesDone}</p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Апгрейд</p>
                        </div>
                        <div className="rounded-xl border border-cb-stroke/50 bg-black/30 py-3">
                          <p className="mt-1 font-mono text-lg font-black text-cb-flame">{accountStats.itemsSold}</p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Продажи</p>
                        </div>
                      </div>
                    </div>
                    {bestDrop ? (
                      <div className={`${profileCard} p-5 sm:p-6`}>
                        <h2 className="text-center text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
                          Лучший дроп
                        </h2>
                        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-base font-bold leading-snug text-white sm:text-lg">
                              {bestDrop.name}
                            </p>
                            {bestDrop.source === "upgrade" ? (
                              <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cb-flame">
                                Выпало в апгрейде
                              </p>
                            ) : null}
                            <div className="mt-3">
                              <SitePriceBadge value={bestDrop.sellPrice} size="md" />
                            </div>
                          </div>
                          <div
                            className={`relative mx-auto h-36 w-36 shrink-0 overflow-hidden rounded-xl ring-1 sm:h-40 sm:w-40 ${
                              rarityClass[bestDrop.rarity] || rarityClass.common
                            }`}
                          >
                            <Image
                              src={
                                bestDrop.image
                                  ? (preferHighResSteamEconomyImage(bestDrop.image) ?? bestDrop.image)
                                  : "/logo.svg"
                              }
                              alt=""
                              fill
                              className={`object-contain p-2 ${bestDrop.image ? SKIN_IMG_QUALITY_CLASS : ""}`}
                              quality={100}
                              unoptimized
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div className={`${profileCard} p-5 sm:p-6`}>
                      <h2 className="text-sm font-black uppercase tracking-wide text-white">Выводы</h2>
                      {myWithdrawals.length ? (
                        <ul className="mt-4 space-y-2 text-sm">
                          {myWithdrawals.slice(0, 20).map((w) => (
                            <li
                              key={w.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cb-stroke/50 bg-black/30 px-3 py-2"
                            >
                              <span className="font-mono text-[11px] text-zinc-500">{w.id.slice(0, 12)}…</span>
                              <span className="text-xs font-semibold uppercase text-zinc-300">{w.status}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-zinc-500">Заявок на вывод пока нет.</p>
                      )}
                    </div>
                  </div>
                )}

                {profileTab === "settings" && (
                  <div className={`${profileCard} mb-10 space-y-4 p-6`}>
                    <p className="text-sm text-zinc-400">
                      Trade URL и выход — в шапке карточки профиля. Данные трейд-ссылки хранятся только в вашем браузере.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setProfileTab("inventory")}
                        className="rounded-xl border border-cb-stroke/70 bg-black/40 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-cb-flame/40"
                      >
                        К инвентарю
                      </button>
                      <button
                        type="button"
                        onClick={logoutProfile}
                        className="rounded-xl border border-red-500/40 bg-red-950/25 px-4 py-2 text-xs font-bold text-red-300 transition hover:bg-red-950/40"
                      >
                        Выйти из аккаунта
                      </button>
                    </div>
                  </div>
                )}

                {profileTab === "deposit" && (
                  <div className="mb-10 space-y-6">
                    <div className="overflow-hidden rounded-2xl border border-violet-500/35 bg-gradient-to-br from-violet-950/40 via-[#0c1022] to-purple-950/30 p-6 sm:p-8">
                      <div className="mb-5 flex flex-wrap items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-900 text-xl shadow-lg shadow-violet-900/50">
                          %
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-white">Промокод</h2>
                          <p className="text-sm text-zinc-500">Бонус на баланс за активацию кода</p>
                        </div>
                      </div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                        Промокод
                      </label>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                        <input
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          placeholder="ВВЕДИТЕ КОД"
                          className="min-h-[3rem] flex-1 rounded-xl border-2 border-violet-600/50 bg-[#070b14]/90 px-4 py-3 font-mono text-sm font-semibold tracking-wider text-white placeholder:text-zinc-600 shadow-inner transition focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                        <button
                          type="button"
                          disabled={promoBusy}
                          onClick={applyPromo}
                          className={`${SITE_MONEY_CTA_CLASS} min-h-[3rem] shrink-0 px-8 text-sm font-black uppercase tracking-wider disabled:opacity-50`}
                        >
                          Применить
                        </button>
                      </div>
                      {promoMsg ? (
                        <p className="mt-4 text-sm text-amber-200/90">{promoMsg}</p>
                      ) : null}
                    </div>
                    <div className={`${profileCard} flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between`}>
                      <FreeKassaBanner imgClassName="max-h-20 sm:max-h-24" />
                      <button
                        type="button"
                        onClick={openTopUp}
                        className={`${SITE_MONEY_CTA_CLASS} shrink-0 px-6 py-3 text-sm font-black uppercase tracking-wider`}
                      >
                        Крипто-пополнение
                      </button>
                    </div>
                  </div>
                )}

                {profileTab === "inventory" && (
                <div
                  id="inventory"
                  className="relative overflow-hidden rounded-2xl border border-cb-stroke/70 bg-gradient-to-b from-[#0a0a0f]/95 via-cb-panel/50 to-black/90 bg-cb-mesh shadow-[inset_0_1px_0_rgba(255,49,49,0.08),0_20px_60px_rgba(0,0,0,0.35)]"
                >
                  <div
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,transparent_40%,rgba(255,49,49,0.07)_50%,transparent_60%)]"
                    aria-hidden
                  />
                  <div className="relative px-4 pb-8 pt-8 sm:px-8">
                    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto rounded-xl border border-cb-stroke/50 bg-black/35 p-2.5 shadow-inner [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <ProfileFilterDropdown
                        value={invWeapon}
                        onChange={setInvWeapon}
                        options={invWeaponDropdownOptions}
                        ariaLabel="Тип оружия"
                        triggerClassName="w-[10.25rem] shrink-0 sm:w-44"
                      />
                      <ProfileFilterDropdown
                        value={invSort}
                        onChange={(v) => setInvSort(v as "priceDesc" | "priceAsc" | "name")}
                        options={INV_SORT_OPTIONS}
                        ariaLabel="Сортировка"
                        triggerClassName="w-[9.5rem] shrink-0 sm:w-40"
                      />
                      <div className="relative min-h-[2.5rem] min-w-[8rem] flex-1">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden>
                          ⌕
                        </span>
                        <input
                          value={invSearch}
                          onChange={(e) => setInvSearch(e.target.value)}
                          placeholder="Поиск по названию"
                          className="h-[2.5rem] w-full min-w-[7rem] rounded-lg border border-cb-stroke/60 bg-black/55 py-2 pl-8 pr-3 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:border-cb-flame/45 focus:outline-none sm:text-xs"
                        />
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap pl-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">Показ:</span>
                        <button
                          type="button"
                          onClick={() => setInvActiveOnly(false)}
                          className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide transition sm:text-[11px] ${
                            !invActiveOnly
                              ? "bg-cb-flame/20 text-cb-flame ring-1 ring-cb-flame/40"
                              : "bg-black/40 text-zinc-500 ring-1 ring-cb-stroke/50 hover:text-zinc-300"
                          }`}
                        >
                          Все
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvActiveOnly(true)}
                          className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide transition sm:text-[11px] ${
                            invActiveOnly
                              ? "bg-cb-flame/20 text-cb-flame ring-1 ring-cb-flame/40"
                              : "bg-black/40 text-zinc-500 ring-1 ring-cb-stroke/50 hover:text-zinc-300"
                          }`}
                        >
                          Активные
                        </button>
                      </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <span className="inline-flex items-center justify-center gap-2 rounded-full border border-cb-flame/25 bg-red-950/20 px-3 py-1.5 text-[11px] font-semibold text-cb-flame/95 sm:justify-start sm:text-xs">
                        <RoundedZapIcon className="h-3.5 w-3.5 shrink-0 text-cb-flame" aria-hidden />
                        Весь дроп с кейсов и апгрейдов
                      </span>
                      <button
                        type="button"
                        disabled={!sellableInventoryCount || sellAllBusy}
                        onClick={() => {
                          void sellAll();
                        }}
                        className={`${SITE_MONEY_CTA_CLASS} min-h-[2.75rem] shrink-0 px-4 py-2.5 text-xs font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:text-sm`}
                      >
                        <RoundedZapIcon className="h-[1.05em] w-[1.05em] shrink-0 text-white opacity-95" aria-hidden />
                        {me.inventory.length === 0
                          ? "Нет предметов для продажи"
                          : !sellableInventoryCount
                            ? "Все предметы на выводе"
                            : sellAllBusy
                              ? "Продаём…"
                              : (
                                <>
                                  Продать всё за{" "}
                                  <SiteMoney value={inventorySellTotal} iconClassName="h-[1.1em] w-[1.1em] text-white" />
                                </>
                              )}
                      </button>
                    </div>

                    {filteredInventory.length > INVENTORY_ITEMS_PER_PAGE ? (
                      <div className="mt-6 space-y-2 border-b border-cb-stroke/30 pb-6">
                        <p className="text-center text-[11px] tabular-nums text-zinc-500 sm:text-xs">
                          {(() => {
                            const total = filteredInventory.length;
                            const from = (safeInventoryPage - 1) * INVENTORY_ITEMS_PER_PAGE + 1;
                            const to = Math.min(safeInventoryPage * INVENTORY_ITEMS_PER_PAGE, total);
                            if (from === to) {
                              return (
                                <>
                                  Показан <span className="font-semibold text-zinc-400">{from}</span>-й предмет из{" "}
                                  <span className="font-semibold text-zinc-400">{total}</span>
                                </>
                              );
                            }
                            return (
                              <>
                                Показаны предметы{" "}
                                <span className="font-semibold text-zinc-400">
                                  {from}–{to}
                                </span>{" "}
                                из <span className="font-semibold text-zinc-400">{total}</span>
                              </>
                            );
                          })()}
                        </p>
                        <InventoryPaginationBar
                          currentPage={safeInventoryPage}
                          totalPages={inventoryTotalPages}
                          onPageChange={goInventoryPage}
                        />
                      </div>
                    ) : null}

                    {filteredInventory.length > 0 ? (
                      <ul className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 md:gap-3 lg:grid-cols-5 lg:gap-3 xl:grid-cols-6">
                        {inventoryPageItems.map((it) => {
                          const rk = normRarity(it.rarity);
                          const bar = rarityBar[rk] || rarityBar.common;
                          const fill = rarityCardFill[rk] || rarityCardFill.common;
                          const { weapon, skin } = splitItemName(it.name);
                          const itemKey = String(it.itemId ?? "").trim();
                          const wdAct = activeWithdrawalByItemId.get(itemKey);
                          const locked = Boolean(wdAct);
                          const pendingWdId = wdAct?.status === "pending" ? wdAct.id : null;
                          const showRub = displayItemRub(it);
                          const priceTitle =
                            it.marketPriceRub != null && it.marketPriceRub > 0
                              ? "Ориентир market.csgo; продажа по цене сайта — другая сумма"
                              : undefined;
                          return (
                            <li
                              key={it.itemId}
                              className={`group flex flex-col overflow-hidden rounded-lg border border-cb-stroke/55 border-b-2 border-b-amber-600/55 shadow-[0_10px_28px_rgba(0,0,0,0.38)] ring-1 ring-black/40 transition hover:border-cb-stroke/80 hover:border-b-amber-500/70 ${fill} ${locked ? "ring-amber-500/30" : ""}`}
                            >
                              <div className="relative px-1.5 pb-0.5 pt-1.5 sm:px-2 sm:pb-1 sm:pt-2">
                                <div className="absolute left-1.5 top-1.5 z-10 max-w-[calc(100%-3rem)] sm:left-2 sm:top-2 sm:max-w-[calc(100%-3.5rem)]">
                                  <SitePriceBadge
                                    value={showRub}
                                    size="sm"
                                    title={priceTitle}
                                    className="!scale-[0.88] !origin-top-left sm:!scale-95"
                                  />
                                </div>
                                {locked && pendingWdId ? (
                                  <div className="absolute right-1.5 top-1.5 z-10 max-w-[4.75rem] text-right sm:right-2 sm:top-2 sm:max-w-[5.5rem]">
                                    <button
                                      type="button"
                                      disabled={cancelWithdrawBusyId === pendingWdId}
                                      onClick={() => void cancelMyWithdraw(pendingWdId)}
                                      className="rounded border border-sky-500/35 bg-sky-950/40 px-1 py-0.5 text-[7px] font-bold uppercase text-sky-300 transition hover:border-sky-400/50 disabled:opacity-50 sm:px-1.5 sm:text-[8px]"
                                    >
                                      {cancelWithdrawBusyId === pendingWdId ? "…" : "Отменить"}
                                    </button>
                                  </div>
                                ) : null}
                                <div className="relative mx-auto mt-6 aspect-square w-[86%] max-w-[6.75rem] sm:mt-7 sm:max-w-[7.75rem]">
                                  {it.image ? (
                                    <Image
                                      src={preferHighResSteamEconomyImage(it.image) ?? it.image}
                                      alt=""
                                      fill
                                      className={`object-contain p-0.5 drop-shadow-[0_6px_18px_rgba(0,0,0,0.4)] sm:p-1 ${SKIN_IMG_QUALITY_CLASS}`}
                                      sizes="(max-width: 640px) 40vw, 110px"
                                      quality={100}
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-lg text-zinc-700 sm:text-2xl">
                                      ?
                                    </div>
                                  )}
                                </div>
                                <div className={`mx-auto mt-1.5 h-0.5 w-[88%] rounded-full sm:mt-2 sm:h-1 sm:w-[90%] ${bar}`} />
                              </div>
                              <div className="flex min-h-[2.5rem] flex-col justify-center px-1.5 py-1 text-center sm:min-h-[2.75rem] sm:px-2 sm:py-1.5">
                                <p className="line-clamp-2 text-[10px] font-bold leading-tight text-white sm:text-[11px]">
                                  {weapon || it.name}
                                </p>
                                {skin ? (
                                  <p className="mt-0.5 line-clamp-2 text-[9px] font-medium text-zinc-300/95 sm:text-[10px]">
                                    {skin}
                                  </p>
                                ) : null}
                                {it.exterior ? (
                                  <p className="mt-0.5 line-clamp-1 text-[8px] capitalize text-zinc-500 sm:text-[9px]">
                                    {it.exterior}
                                  </p>
                                ) : null}
                              </div>
                              <div className="mt-auto space-y-1 border-t border-cb-stroke/45 bg-black/55 p-1.5 sm:space-y-1.5 sm:p-2">
                                <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                                  <button
                                    type="button"
                                    title={locked ? "Предмет на выводе" : "Заявка на вывод"}
                                    disabled={locked}
                                    onClick={() => {
                                      if (locked) return;
                                      setWithdrawErr(null);
                                      setWithdrawTradeUrl(tradeUrl.trim());
                                      setWithdrawItem(it);
                                    }}
                                    className="rounded-md border border-cb-stroke/60 bg-zinc-950/80 py-1.5 text-[8px] font-black uppercase tracking-wide text-zinc-300 transition hover:border-cb-flame/45 hover:bg-zinc-900/90 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 sm:rounded-lg sm:py-2 sm:text-[9px] md:text-[10px]"
                                  >
                                    Вывод
                                  </button>
                                  {locked ? (
                                    <span className="flex cursor-not-allowed items-center justify-center rounded-md border border-cb-stroke/40 bg-black/30 py-1.5 text-[8px] font-black uppercase tracking-wide text-zinc-600 opacity-50 sm:rounded-lg sm:py-2 sm:text-[9px] md:text-[10px]">
                                      Апгрейд
                                    </span>
                                  ) : (
                                    <Link
                                      href="/upgrade"
                                      title="Апгрейд"
                                      className="flex items-center justify-center rounded-md border border-cb-stroke/60 bg-zinc-950/80 py-1.5 text-center text-[8px] font-black uppercase tracking-wide text-zinc-300 transition hover:border-cb-flame/45 hover:bg-zinc-900/90 hover:text-white sm:rounded-lg sm:py-2 sm:text-[9px] md:text-[10px]"
                                    >
                                      Апгрейд
                                    </Link>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  title={locked ? "Предмет на выводе" : "Продать на баланс"}
                                  disabled={locked}
                                  onClick={() => {
                                    if (locked) return;
                                    void sell(it.itemId);
                                  }}
                                  className="flex w-full items-center justify-center gap-0.5 rounded-md bg-gradient-to-b from-red-500 to-[#b91c1c] py-1.5 text-[8px] font-black uppercase tracking-wide text-white shadow-[0_3px_10px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-35 sm:gap-1 sm:rounded-lg sm:py-2 sm:text-[9px] md:gap-1.5 md:text-[10px]"
                                >
                                  <RoundedZapIcon className="h-2.5 w-2.5 shrink-0 text-white opacity-95 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" aria-hidden />
                                  Продать
                                  <SiteMoney
                                    value={showRub}
                                    className="text-[8px] font-black text-white sm:text-[9px] md:text-[10px]"
                                    iconClassName="h-2 w-2 text-white sm:h-2.5 sm:w-2.5 md:h-3 md:w-3"
                                  />
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : me.inventory.length > 0 ? (
                      <div className="mt-10 rounded-xl border border-dashed border-amber-500/30 bg-amber-950/10 px-6 py-14 text-center text-sm text-amber-200/90">
                        По выбранным фильтрам предметов нет. Сбросьте фильтры или измените поиск.
                      </div>
                    ) : (
                      <div className="mt-10 rounded-xl border border-dashed border-cb-stroke/60 bg-black/25 px-6 py-14 text-center text-sm text-zinc-500">
                        Инвентарь пуст. Откройте кейс на главной.
                      </div>
                    )}

                    {filteredInventory.length > INVENTORY_ITEMS_PER_PAGE ? (
                      <div className="mt-8 border-t border-cb-stroke/30 pt-6">
                        <InventoryPaginationBar
                          currentPage={safeInventoryPage}
                          totalPages={inventoryTotalPages}
                          onPageChange={goInventoryPage}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
                )}

                <div className="mt-10 flex justify-center sm:justify-start">
                  <Link
                    href="/"
                    className={`${SITE_MONEY_CTA_CLASS} px-8 py-3`}
                  >
                    На главную
                  </Link>
                </div>
              </>
            )}
      </div>

      {withdrawItem ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Закрити"
            disabled={withdrawBusy}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm disabled:cursor-wait"
            onClick={() => {
              if (!withdrawBusy) setWithdrawItem(null);
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-cb-stroke/80 bg-[#0a0e14] p-5 shadow-2xl shadow-black/60 sm:p-6">
            <h3 className="text-sm font-black uppercase tracking-wide text-white">Вывод предмета</h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              Заявка попадёт к админу. После подтверждения с вашего аккаунта market.csgo выполняется покупка лота
              (buy-for) и обмен на указанный trade URL. Убедитесь, что ссылка актуальна и на маркете достаточно
              средств.
            </p>
            <p className="mt-2 rounded-lg border border-amber-600/35 bg-amber-950/25 px-3 py-2 text-[11px] leading-snug text-amber-200/95">
              В Steam откройте инвентарь для всех:{" "}
              <span className="font-semibold text-amber-100">Профиль → Редактировать профиль → Конфиденциальность</span> — пункт
              про инвентарь должен быть <span className="font-semibold">«Открытый»</span> (Public). Иначе биржа не отправит
              обмен.
            </p>
            <p className="mt-3 line-clamp-2 text-sm font-semibold text-zinc-200">{withdrawItem.name}</p>
            <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Steam trade URL
            </label>
            <input
              value={withdrawTradeUrl}
              onChange={(e) => setWithdrawTradeUrl(e.target.value)}
              placeholder="https://steamcommunity.com/tradeoffer/new/?partner=…&token=…"
              className="mt-1.5 w-full rounded-xl border border-cb-stroke/70 bg-black/50 px-3 py-2.5 font-mono text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:border-cb-flame/50 focus:outline-none focus:ring-1 focus:ring-cb-flame/30"
            />
            {withdrawErr ? (
              <p className="mt-3 text-xs text-red-400">{withdrawErr}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={withdrawBusy}
                onClick={() => setWithdrawItem(null)}
                className="rounded-xl border border-cb-stroke bg-black/40 px-4 py-2 text-xs font-semibold text-zinc-400 transition hover:text-white disabled:opacity-50"
              >
                Скасувати
              </button>
              <button
                type="button"
                disabled={withdrawBusy}
                onClick={() => void submitWithdraw()}
                className="rounded-xl border-2 border-cb-flame/60 bg-cb-flame/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-cb-flame/20 disabled:opacity-50"
              >
                {withdrawBusy ? "Отправка…" : "Подать заявку"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SiteShell>
  );
}
