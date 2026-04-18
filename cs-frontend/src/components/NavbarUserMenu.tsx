"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { clearToken } from "@/lib/api";
import { SiteMoney } from "@/components/SiteMoney";
import { prefetchUpgradePageData } from "@/lib/upgradePrefetch";

export type NavbarUserMenuMe = {
  displayName: string;
  avatar: string;
  balance: number;
  isAdmin?: boolean;
  isSupportStaff?: boolean;
  isPartner?: boolean;
};

type Props = {
  me: NavbarUserMenuMe;
  /** Тригер у головній шапці сайту або в тёмній шапці кабінету / адмінки */
  variant?: "site" | "dashboard";
};

export function NavbarUserMenu({ me, variant = "site" }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const warmUpgradeNav = useCallback(() => {
    router.prefetch("/upgrade");
    prefetchUpgradePageData();
  }, [router]);

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
    setMenuOpen(false);
    window.location.reload();
  }

  const triggerClass =
    variant === "dashboard"
      ? "flex max-w-[220px] min-w-0 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-black/30 py-1.5 pl-1.5 pr-3 transition hover:border-cb-flame/35 hover:bg-white/[0.04]"
      : "flex items-center gap-2.5 rounded-xl border border-cb-stroke/90 bg-cb-panel/50 py-1.5 pl-1.5 pr-3 transition hover:border-cb-flame/35 hover:bg-cb-panel/70";

  const avatarRing =
    variant === "dashboard"
      ? "relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-cb-flame/20"
      : "relative h-9 w-9 shrink-0 overflow-hidden rounded-lg ring-2 ring-red-900/40";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        className={triggerClass}
        aria-expanded={menuOpen}
        aria-haspopup="true"
        aria-label="Меню аккаунта"
      >
        <span className={avatarRing}>
          {me.avatar ? (
            <Image
              src={me.avatar}
              alt=""
              width={40}
              height={40}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-xs text-zinc-500">…</div>
          )}
        </span>
        <span
          className={`hidden min-w-0 truncate text-left text-sm font-medium text-zinc-200 sm:block ${
            variant === "dashboard" ? "flex-1" : "max-w-[120px]"
          }`}
        >
          {me.displayName?.trim() || "Профиль"}
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
          className="absolute right-0 top-full z-[60] mt-2 w-[min(16rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-cb-stroke bg-zinc-950/95 py-2 shadow-2xl shadow-black/50 backdrop-blur-xl sm:w-64 sm:max-w-none"
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
              window.dispatchEvent(new Event("cd-open-crypto-topup"));
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
          {me.isPartner && (
            <Link
              href="/partner"
              role="menuitem"
              className="block px-4 py-2.5 text-sm text-emerald-300/95 hover:bg-emerald-950/25 hover:text-emerald-200"
              onClick={() => setMenuOpen(false)}
            >
              Партнёрский кабинет
            </Link>
          )}
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
  );
}
