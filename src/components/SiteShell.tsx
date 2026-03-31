"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, clearToken, getToken, steamLoginUrl } from "@/lib/api";
import { formatRub } from "@/lib/money";
import { useLiveDrops } from "@/hooks/useLiveDrops";
import { LiveDropsRail } from "@/components/LiveDropsRail";
import { CryptoTopUpModal } from "@/components/CryptoTopUpModal";

type Me = {
  displayName: string;
  avatar: string;
  balance: number;
  isAdmin?: boolean;
  isSupportStaff?: boolean;
};

type Props = {
  children: React.ReactNode;
};

/** Іконка «апгрейд»: три шеврони вгору в стилі сайту (cb-flame + приглушений «ободок»). */
function UpgradeNavIcon({ className }: { className?: string }) {
  const muted = "#6B565C";
  const flame = "#ff3131";
  const stroke = 2.25;
  return (
    <svg
      className={className}
      width={36}
      height={32}
      viewBox="0 0 36 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <filter id="cb-upgrade-chevron-glow" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M6 20 L18 12 L30 20"
        stroke={muted}
        strokeOpacity={0.9}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 14 L18 6 L30 14"
        stroke={flame}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#cb-upgrade-chevron-glow)"
      />
      <path
        d="M6 8 L18 0 L30 8"
        stroke={muted}
        strokeOpacity={0.9}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SupportFabLink() {
  const pathname = usePathname();
  if (pathname.startsWith("/support")) return null;
  return (
    <Link
      href="/support"
      aria-label="Підтримка"
      title="Підтримка"
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

export function SiteShell({ children }: Props) {
  const drops = useLiveDrops();
  const [me, setMe] = useState<Me | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cryptoTopUpOpen, setCryptoTopUpOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setMe(null);
      return;
    }
    const r = await apiFetch<Me>("/api/me");
    if (r.ok && r.data) setMe(r.data);
    else setMe(null);
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

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

  const balanceStr = me ? formatRub(me.balance) : null;

  return (
    <div className="flex min-h-screen flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
      <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-4 border-b border-cb-stroke/80 bg-cb-void/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 drop-shadow-[0_0_12px_rgba(255,49,49,0.45)]"
            priority
          />
          <span className="bg-gradient-to-r from-white via-cb-flame to-red-300 bg-clip-text text-xl font-black tracking-tight text-transparent">
            StormBattle
          </span>
        </Link>
        <nav className="flex flex-1 items-center justify-center sm:flex-none sm:justify-start">
          <Link
            href="/upgrade"
            className="group flex flex-col items-center gap-0.5 rounded-lg px-2 py-0.5 outline-none transition hover:opacity-100 focus-visible:ring-2 focus-visible:ring-cb-flame/45 focus-visible:ring-offset-2 focus-visible:ring-offset-cb-void sm:px-3"
          >
            <UpgradeNavIcon className="h-7 w-8 shrink-0 transition group-hover:drop-shadow-[0_0_12px_rgba(255,49,49,0.45)] sm:h-8 sm:w-9" />
            <span className="bg-gradient-to-r from-zinc-200 via-cb-flame to-red-300 bg-clip-text text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-transparent sm:text-[11px]">
              Апгрейд
            </span>
          </Link>
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
          {me && balanceStr && (
            <div className="hidden items-stretch lg:flex">
              <div className="flex items-center gap-1.5 rounded-3xl border border-cb-stroke/70 bg-gradient-to-br from-zinc-950/95 via-cb-panel/35 to-black/90 p-1 pl-3 shadow-[inset_0_1px_0_rgba(255,49,49,0.1),0_4px_24px_rgba(0,0,0,0.35)]">
                <div className="flex min-w-0 flex-col justify-center gap-0.5 py-1.5 pr-1">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Баланс
                  </span>
                  <span className="font-mono text-lg font-black tabular-nums leading-none tracking-tight text-white">
                    {balanceStr}
                    <span className="ml-1 text-base font-bold text-cb-flame/95">₽</span>
                  </span>
                </div>
                <div className="h-8 w-px shrink-0 self-center bg-gradient-to-b from-transparent via-cb-stroke/80 to-transparent" aria-hidden />
                <button
                  type="button"
                  onClick={() => setCryptoTopUpOpen(true)}
                  className="shrink-0 rounded-xl bg-gradient-to-r from-red-900/90 via-cb-flame/90 to-red-600/95 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-white shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:ring-2 focus-visible:ring-cb-flame/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                >
                  Пополнить
                </button>
              </div>
            </div>
          )}
          {me ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCryptoTopUpOpen(true)}
                className="rounded-2xl border border-cb-flame/40 bg-gradient-to-r from-red-950/70 to-cb-flame/20 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-cb-flame transition hover:border-cb-flame/60 hover:brightness-110 lg:hidden"
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
                    <p className="mt-1 font-mono text-xs text-cb-flame">
                      {formatRub(me.balance)} <span className="text-zinc-500">₽</span>
                    </p>
                  </div>
                  <Link
                    href="/upgrade"
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-cb-flame"
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
                      Панель підтримки
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
    </div>
  );
}
