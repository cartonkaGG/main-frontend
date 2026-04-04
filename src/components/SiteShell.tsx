"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { apiFetch, clearToken, getToken, steamLoginUrl } from "@/lib/api";
import { SiteMoney } from "@/components/SiteMoney";
import { useLiveDrops } from "@/hooks/useLiveDrops";
import { LiveDropsRail } from "@/components/LiveDropsRail";
import { CryptoTopUpModal } from "@/components/CryptoTopUpModal";
import { RoundedZapIcon } from "@/components/icons/RoundedZapIcon";
import { SITE_MONEY_CTA_COMPACT_CLASS, SITE_MONEY_CTA_TINY_CLASS } from "@/lib/siteMoneyStyles";
import { prefetchUpgradePageData } from "@/lib/upgradePrefetch";

/** Дані шапки з легкого GET /api/me/session (без важкого /api/me). */
type Me = {
  displayName: string;
  avatar: string;
  balance: number;
  isAdmin?: boolean;
  isSupportStaff?: boolean;
};

type MeSessionApi = {
  displayName: string;
  avatar: string;
  balance?: number;
  isAdmin?: boolean;
  isSupportStaff?: boolean;
};

type Props = {
  children: React.ReactNode;
};

function NavChevronUp({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function SupportFabLink() {
  const pathname = usePathname();
  if (pathname.startsWith("/support")) return null;
  return (
    <Link
      href="/support"
      aria-label="Поддержка"
      title="Поддержка"
      className="fixed bottom-4 right-4 z-[100] flex h-14 w-14 items-center justify-center rounded-full border border-sky-500/40 bg-gradient-to-br from-sky-600/95 via-slate-900 to-slate-950 text-white shadow-[0_0_28px_rgba(56,189,248,0.35)] transition hover:border-sky-400/70 hover:brightness-110 focus-visible:outline focus-visible:ring-2 focus-visible:ring-sky-400/50"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden className="text-sky-100">
        <path
          d="M12 18a6 6 0 0 0 6-6V8a6 6 0 1 0-12 0v4a6 6 0 0 0 6 6Z"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinejoin="round"
        />
        <path d="M8 14v2a4 4 0 0 0 8 0v-2" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
        <path d="M12 18v3" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      </svg>
    </Link>
  );
}

type SupportReplyToast = { ticketId: string; subject: string };

export function SiteShell({ children }: Props) {
  const drops = useLiveDrops();
  const [me, setMe] = useState<Me | null>(null);
  /** SSR і перший кадр без localStorage — не смикати шапку «гість → залогінений» */
  const [hasBrowserToken, setHasBrowserToken] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cryptoTopUpOpen, setCryptoTopUpOpen] = useState(false);
  const [supportToast, setSupportToast] = useState<SupportReplyToast | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    setHasBrowserToken(Boolean(getToken()));
  }, []);

  useEffect(() => {
    const sync = () => setHasBrowserToken(Boolean(getToken()));
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cd_token" || e.key === null) sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setMe(null);
      return;
    }
    const r = await apiFetch<MeSessionApi>("/api/me/session");
    if (r.ok && r.data) {
      setMe({
        displayName: r.data.displayName,
        avatar: r.data.avatar,
        balance: typeof r.data.balance === "number" ? r.data.balance : 0,
        isAdmin: r.data.isAdmin,
        isSupportStaff: r.data.isSupportStaff,
      });
    } else setMe(null);
  }, []);

  useEffect(() => {
    if (!hasBrowserToken) {
      setMe(null);
      return;
    }
    void loadMe();
  }, [hasBrowserToken, loadMe]);

  useEffect(() => {
    const h = () => loadMe();
    window.addEventListener("cd-balance-updated", h);
    return () => window.removeEventListener("cd-balance-updated", h);
  }, [loadMe]);

  useEffect(() => {
    const h = () => setCryptoTopUpOpen(true);
    window.addEventListener("cd-open-crypto-topup", h);
    return () => window.removeEventListener("cd-open-crypto-topup", h);
  }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handle);
      return () => document.removeEventListener("mousedown", handle);
    }
  }, [menuOpen]);

  function logout() {
    clearToken();
    setMe(null);
    setMenuOpen(false);
    window.location.reload();
  }

  const pathname = usePathname();
  const router = useRouter();
  const upgradeActive = pathname.startsWith("/upgrade");
  const warmUpgradeNav = useCallback(() => {
    router.prefetch("/upgrade");
    prefetchUpgradePageData();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
      <header className="sticky top-0 z-50 flex min-h-20 flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] bg-[#050505]/80 px-4 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:px-6 sm:py-0">
        <div className="flex min-w-0 flex-1 items-center gap-8">
          <Link
            href="/"
            className="group flex shrink-0 cursor-pointer items-center gap-2.5 outline-none transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-500/50 opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100" />
              <RoundedZapIcon className="relative z-10 h-8 w-8 -skew-x-12 text-red-500 transition-transform duration-500 group-hover:scale-110 sm:h-9 sm:w-9" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white sm:text-[1.65rem]">
              Storm
              <span className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">Battle</span>
            </span>
          </Link>
          <Link
            href="/upgrade"
            prefetch
            onPointerEnter={warmUpgradeNav}
            onFocus={warmUpgradeNav}
            className={`group relative flex shrink-0 items-center gap-2 overflow-hidden rounded-lg border bg-gradient-to-b px-4 py-2 outline-none transition-all focus-visible:ring-2 focus-visible:ring-red-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] ${
              upgradeActive
                ? "border-red-500/50 from-red-500/20 to-transparent"
                : "border-red-500/20 from-red-500/10 to-transparent hover:border-red-500/50"
            }`}
          >
            <div className="absolute inset-0 translate-y-full bg-red-500/10 transition-transform duration-300 ease-out group-hover:translate-y-0" />
            <div className="relative z-10 flex flex-col -space-y-2 text-red-500 transition-transform duration-300 group-hover:-translate-y-0.5">
              <NavChevronUp className="h-4 w-4 shrink-0" />
              <NavChevronUp className="h-4 w-4 shrink-0" />
            </div>
            <span className="relative z-10 text-sm font-bold uppercase tracking-wider text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.3)]">
              Апгрейд
            </span>
          </Link>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
          {me && (
            <div className="hidden items-stretch lg:flex">
              <div className="flex items-center gap-1.5 rounded-3xl border border-cb-stroke/70 bg-gradient-to-br from-zinc-950/95 via-cb-panel/35 to-black/90 p-1 pl-3 shadow-[inset_0_1px_0_rgba(255,49,49,0.1),0_4px_24px_rgba(0,0,0,0.35)]">
                <div className="flex min-w-0 flex-col justify-center gap-0.5 py-1.5 pr-1">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Баланс
                  </span>
                  <SiteMoney
                    value={me.balance}
                    className="text-lg font-black leading-none tracking-tight text-white"
                    iconClassName="h-[1.2rem] w-[1.2rem] shrink-0 text-cb-flame drop-shadow-[0_0_10px_rgba(255,49,49,0.45)]"
                  />
                </div>
                <div className="h-8 w-px shrink-0 self-center bg-gradient-to-b from-transparent via-cb-stroke/80 to-transparent" aria-hidden />
                <button
                  type="button"
                  onClick={() => setCryptoTopUpOpen(true)}
                  className={`${SITE_MONEY_CTA_COMPACT_CLASS} shrink-0 focus-visible:outline focus-visible:ring-2 focus-visible:ring-cb-flame/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950`}
                >
                  Пополнить
                </button>
              </div>
            </div>
          )}
          {hasBrowserToken && !me ? (
            <div className="flex items-center gap-2" aria-busy>
              <div className="h-10 w-28 animate-pulse rounded-2xl bg-zinc-800/80 sm:w-36" />
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-zinc-800/80" />
            </div>
          ) : me ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCryptoTopUpOpen(true)}
                className={`${SITE_MONEY_CTA_TINY_CLASS} rounded-2xl lg:hidden`}
              >
                Пополнить
              </button>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 rounded-xl border border-cb-stroke/90 bg-cb-panel/50 py-1.5 pl-1.5 pr-3 transition hover:border-cb-flame/35 hover:bg-cb-panel/70"
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg ring-2 ring-red-900/40">
                  <Image
                    src={me.avatar || "/logo.svg"}
                    alt=""
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </span>
                <span className="hidden max-w-[120px] truncate text-left text-sm font-medium text-zinc-200 sm:block">
                  {me.displayName}
                </span>
                <svg
                  className={`h-4 w-4 shrink-0 text-zinc-500 transition ${menuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-full z-[60] mt-2 w-64 overflow-hidden rounded-xl border border-cb-stroke bg-zinc-950/95 py-2 shadow-2xl shadow-black/50 backdrop-blur-xl"
                  role="menu"
                >
                  <div className="border-b border-cb-stroke px-4 py-3">
                    <p className="truncate text-sm font-semibold text-white">{me.displayName}</p>
                    <p className="mt-1 max-w-full min-w-0 truncate text-xs text-cb-flame">
                      <SiteMoney
                        value={me.balance}
                        className="font-mono"
                        iconClassName="h-4 w-4 shrink-0 text-cb-flame"
                      />
                    </p>
                  </div>
                  <Link
                    href="/upgrade"
                    prefetch
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-cb-flame"
                    onPointerEnter={warmUpgradeNav}
                    onFocus={warmUpgradeNav}
                    onClick={() => setMenuOpen(false)}
                  >
                    Апгрейд
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-4 py-2.5 text-left text-sm text-cb-flame hover:bg-red-950/20"
                    onClick={() => {
                      setMenuOpen(false);
                      setCryptoTopUpOpen(true);
                    }}
                  >
                    Пополнить
                  </button>
                  <Link
                    href="/profile"
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
                    onClick={() => setMenuOpen(false)}
                  >
                    Профиль и инвентарь
                  </Link>
                  {me.isSupportStaff && !me.isAdmin && (
                    <Link
                      href="/admin/support"
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm text-sky-300/95 hover:bg-sky-950/30 hover:text-sky-200"
                      onClick={() => setMenuOpen(false)}
                    >
                      Панель поддержки
                    </Link>
                  )}
                  {me.isAdmin && (
                    <Link
                      href="/admin/cases"
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm text-amber-400/95 hover:bg-amber-950/30 hover:text-amber-300"
                      onClick={() => setMenuOpen(false)}
                    >
                      Админ-панель
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full px-4 py-2.5 text-left text-sm text-zinc-400 hover:bg-red-950/25 hover:text-red-300"
                    onClick={logout}
                  >
                    Выйти
                  </button>
                </div>
              )}
            </div>
            </div>
          ) : (
            <a
              href={steamLoginUrl()}
              className="rounded-lg bg-gradient-to-r from-red-700 to-cb-flame px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-900/30 hover:brightness-110"
            >
              Steam
            </a>
          )}
        </div>
      </header>

      <LiveDropsRail drops={drops}>{children}</LiveDropsRail>
      <CryptoTopUpModal
        open={cryptoTopUpOpen}
        onClose={() => setCryptoTopUpOpen(false)}
        onSuccess={() => setCryptoTopUpOpen(false)}
      />
      <SupportFabLink />

      {supportToast && (
        <div
          className="fixed bottom-20 right-4 z-[120] max-w-sm sm:bottom-6 sm:right-6"
          role="status"
        >
          <div className="rounded-2xl border border-sky-500/40 bg-gradient-to-br from-sky-950/95 via-zinc-950 to-black p-4 shadow-[0_0_32px_rgba(56,189,248,0.25)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-sky-400/90">
                  Поддержка ответила
                </p>
                <p className="mt-1 truncate text-sm font-medium text-zinc-100">
                  {supportToast.subject || "Ваше обращение"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Закрыть уведомление"
                className="shrink-0 rounded-lg p-1 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200"
                onClick={() => setSupportToast(null)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <Link
              href={`/support/${encodeURIComponent(supportToast.ticketId)}`}
              className="mt-3 block w-full rounded-xl bg-sky-600 py-2.5 text-center text-sm font-bold text-white transition hover:bg-sky-500"
              onClick={() => setSupportToast(null)}
            >
              Открыть переписку
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
