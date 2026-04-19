"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePartnerCabinetTab } from "@/contexts/PartnerCabinetTabContext";
import type { PartnerCabinetTab } from "@/contexts/PartnerCabinetTabContext";
import { SiteMoney } from "@/components/SiteMoney";
import { NavbarNotifications } from "@/components/NavbarNotifications";
import { NavbarUserMenu } from "@/components/NavbarUserMenu";
import { PartnerLevelHudOrb } from "@/components/PartnerLevelHudOrb";

type Session = {
  displayName: string;
  avatar: string;
  balance?: number;
  isAdmin?: boolean;
  isSupportStaff?: boolean;
  isPartner?: boolean;
  /** Рівень партнерки з /api/me/session (за замовчуванням 0). */
  partnerLevel?: number;
};

function IconNav({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center sm:h-8 sm:w-8 [&>svg]:h-full [&>svg]:w-full ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

function DashboardIcon({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={active ? "text-cb-flame" : "text-zinc-500"} aria-hidden>
      <path
        d="M4 13h6V4H4v9zm10 0h6V4h-6v9zM4 20h6v-5H4v5zm10 0h6v-5h-6v5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FaqIcon({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={active ? "text-cb-flame" : "text-zinc-500"} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10.5 9.5c0-1 .75-1.75 1.75-1.75 1.25 0 2 .85 2 1.75 0 1.5-1.25 1.75-1.75 2.25-.35.35-.5.65-.5 1.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="0.75" fill="currentColor" />
    </svg>
  );
}

function MaterialIcon({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={active ? "text-cb-flame" : "text-zinc-500"} aria-hidden>
      <path
        d="M4 5h16v14H4V5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M4 9h16M8 13h8M8 17h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const nav: { tab: PartnerCabinetTab; label: string; Icon: typeof DashboardIcon }[] = [
  { tab: "analytics", label: "Аналитика", Icon: DashboardIcon },
  { tab: "material", label: "Материал", Icon: MaterialIcon },
  { tab: "faq", label: "F.A.Q", Icon: FaqIcon },
];

export function PartnerDashboardShell({ children }: { children: React.ReactNode }) {
  const { tab, setTab } = usePartnerCabinetTab();
  const [me, setMe] = useState<Session | null>(null);

  const load = useCallback(async () => {
    const r = await apiFetch<Session>("/api/me/session");
    if (r.ok && r.data) {
      setMe({
        displayName: r.data.displayName,
        avatar: r.data.avatar || "",
        balance: r.data.balance,
        isAdmin: r.data.isAdmin,
        isSupportStaff: r.data.isSupportStaff,
        isPartner: r.data.isPartner,
        partnerLevel: typeof r.data.partnerLevel === "number" ? r.data.partnerLevel : 0,
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex min-h-[100dvh] w-full bg-[#0a0a0a] text-zinc-100">
      <aside className="sticky top-0 flex h-[100dvh] w-[300px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0c0c0c]">
        <div className="border-b border-white/[0.06] px-5 py-6">
          <Link
            href="/"
            className="flex items-center gap-4 outline-none transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500/50"
          >
            <div className="min-w-0 flex-1">
              <span className="text-xl font-black tracking-tight text-white">
                Storm
                <span className="text-cb-flame drop-shadow-[0_0_12px_rgba(255,49,49,0.45)]">Battle</span>
              </span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                Кабинет партнёра
              </span>
            </div>
            <Image
              src="/partner-handshake-logo.png"
              alt=""
              width={112}
              height={112}
              className="h-[4.375rem] w-[4.375rem] shrink-0 -translate-x-2 object-contain sm:h-20 sm:w-20 sm:-translate-x-2.5"
              aria-hidden
            />
          </Link>
        </div>

        {me ? (
          <Link
            href="/profile"
            className="mx-4 mt-4 flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/35 px-3 py-3 transition hover:border-cb-flame/25 hover:bg-white/[0.03]"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-white/[0.08]">
              {me.avatar ? (
                <Image
                  src={me.avatar}
                  alt={me.displayName}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center bg-zinc-800 text-lg font-bold text-zinc-500"
                  aria-hidden
                >
                  ?
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <p className="truncate text-base font-semibold leading-tight text-white">{me.displayName}</p>
              <div className="shrink-0" title="Уровень партнёрской программы">
                <PartnerLevelHudOrb level={me.partnerLevel ?? 0} compact />
              </div>
            </div>
          </Link>
        ) : (
          <div className="mx-4 mt-4 flex animate-pulse items-center gap-3 rounded-2xl border border-white/[0.06] bg-zinc-900/50 px-3 py-3">
            <div className="h-14 w-14 shrink-0 rounded-full bg-zinc-800" />
            <div className="flex-1">
              <div className="h-5 w-28 rounded bg-zinc-800" />
            </div>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1.5 px-4 py-5" aria-label="Разделы кабинета">
          {nav.map(({ tab: id, label, Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex w-full items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left text-base font-semibold leading-snug transition sm:gap-4 sm:py-4 ${
                  active
                    ? "bg-cb-flame/12 text-white shadow-[inset_0_0_0_1px_rgba(255,49,49,0.35)]"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                }`}
              >
                <IconNav>
                  <Icon active={active} />
                </IconNav>
                {label}
              </button>
            );
          })}
          <Link
            href="/"
            className="mt-1 block rounded-xl border border-white/10 bg-zinc-900/80 px-4 py-3 text-center text-sm font-semibold text-zinc-300 transition hover:border-cb-flame/30 hover:text-white"
          >
            Вернуться на сайт
          </Link>
        </nav>
        <div className="mt-auto space-y-2 border-t border-white/[0.06] p-4">
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-cb-flame"
          >
            Профиль и инвентарь
          </Link>
          <Link
            href="/support"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-300"
          >
            <span className="text-lg leading-none">?</span>
            Центр поддержки
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-end gap-3 border-b border-white/[0.06] bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            {me && (
              <div className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-black/40 px-2 py-1.5 sm:flex">
                <span className="pl-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Баланс</span>
                <SiteMoney
                  value={me.balance ?? 0}
                  className="text-sm font-bold text-white"
                  iconClassName="h-4 w-4 text-cb-flame"
                />
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event("cd-open-crypto-topup"))}
                  className="rounded-lg border border-cb-flame/35 bg-cb-flame/10 px-2 py-1 text-[11px] font-bold text-cb-flame transition hover:bg-cb-flame/20"
                >
                  Пополнить
                </button>
              </div>
            )}
            <NavbarNotifications />
            {me ? (
              <NavbarUserMenu
                me={{
                  displayName: me.displayName,
                  avatar: me.avatar || "",
                  balance: me.balance ?? 0,
                  isAdmin: me.isAdmin,
                  isSupportStaff: me.isSupportStaff,
                  isPartner: me.isPartner,
                }}
                variant="dashboard"
              />
            ) : null}
          </div>
        </header>

        <div
          className="flex gap-1.5 overflow-x-auto border-b border-white/[0.06] bg-[#0a0a0a] px-3 py-2.5 lg:hidden"
          role="tablist"
          aria-label="Разделы"
        >
          {nav.map(({ tab: id, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(id)}
                className={`shrink-0 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-cb-flame/15 text-cb-flame"
                    : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
