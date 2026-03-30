"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, clearToken, getToken, steamLoginUrl } from "@/lib/api";
import { formatRub } from "@/lib/money";
import { useLiveDrops } from "@/hooks/useLiveDrops";
import { LiveDropsRail } from "@/components/LiveDropsRail";

type Me = {
  displayName: string;
  avatar: string;
  balance: number;
  isAdmin?: boolean;
};

type Props = {
  children: React.ReactNode;
};

export function SiteShell({ children }: Props) {
  const drops = useLiveDrops();
  const [me, setMe] = useState<Me | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
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
    <div className="flex min-h-screen flex-col">
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
            CaseDrop
          </span>
        </Link>
        <nav className="order-3 flex w-full flex-wrap items-center justify-center gap-5 text-sm text-zinc-400 sm:order-none sm:w-auto sm:justify-start">
          <Link href="/" className="hover:text-cb-flame">
            Главная
          </Link>
          <Link href="/cases" className="hover:text-cb-flame">
            Кейсы
          </Link>
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
          {me && balanceStr && (
            <div className="hidden lg:block">
              <div className="inline-flex flex-col items-center gap-0.5 rounded-xl border border-orange-500/35 bg-gradient-to-r from-orange-950/50 to-violet-950/40 px-3 py-1.5 sm:items-start">
                <span className="text-[9px] font-bold uppercase tracking-widest text-orange-300/80">
                  Баланс
                </span>
                <span className="font-mono text-base font-black text-white">
                  {balanceStr}{" "}
                  <span className="text-sm font-bold text-orange-400/90">₽</span>
                </span>
              </div>
            </div>
          )}
          {me ? (
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
                    href="/profile"
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
                    onClick={() => setMenuOpen(false)}
                  >
                    Профиль и инвентарь
                  </Link>
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

      <footer className="border-t border-cb-stroke/80 bg-cb-panel/30 px-6 py-4 text-center text-xs text-zinc-600 backdrop-blur-sm">
        Логотип можно заменить на свой PNG в <code className="text-zinc-500">public/logo.png</code>{" "}
        (или оставить <code className="text-zinc-500">logo.svg</code>).
      </footer>
    </div>
  );
}
