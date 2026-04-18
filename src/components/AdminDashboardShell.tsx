"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { SiteMoney } from "@/components/SiteMoney";
import { NavbarNotifications } from "@/components/NavbarNotifications";
import { AdminWithdrawalAlerts } from "@/components/AdminWithdrawalAlerts";
import { NavbarUserMenu } from "@/components/NavbarUserMenu";

type Session = {
  displayName: string;
  avatar: string;
  balance?: number;
  isAdmin?: boolean;
  isSupportStaff?: boolean;
  isPartner?: boolean;
};

const adminLinks: { href: string; label: string }[] = [
  { href: "/admin/stats", label: "Статистика" },
  { href: "/admin/cases", label: "Кейсы" },
  { href: "/admin/site-ui", label: "Главная: банер и карточки" },
  { href: "/admin/legal-docs", label: "Юридические документы" },
  { href: "/admin/promos", label: "Промокоды" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/beta", label: "Бета-доступ" },
  { href: "/admin/deposits", label: "Пополнения" },
  { href: "/admin/partners", label: "Партнёры" },
  { href: "/admin/withdrawals", label: "Вывод Market.csgo" },
  { href: "/admin/audit-logs", label: "Логи админов" },
  { href: "/admin/support", label: "Обращения" },
];

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href + "/");
}

export function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const full = Boolean(me?.isAdmin);
  const supportOnly = Boolean(me && me.isSupportStaff && !me.isAdmin);
  const panelTitle = !me ? "…" : full ? "Админ-панель" : supportOnly ? "Поддержка" : "Панель";

  return (
    <div className="flex min-h-[100dvh] w-full bg-[#0a0a0a] text-zinc-100">
      <aside className="sticky top-0 flex h-[100dvh] w-[260px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0c0c0c]">
        <div className="border-b border-white/[0.06] px-5 py-6">
          <Link href="/" className="block">
            <span className="text-xl font-black tracking-tight text-white">
              Storm
              <span className="text-cb-flame drop-shadow-[0_0_12px_rgba(255,49,49,0.45)]">Battle</span>
            </span>
            <span
              className={`mt-1 block text-[10px] font-bold uppercase tracking-[0.2em] ${
                supportOnly ? "text-sky-400/90" : "text-amber-500/85"
              }`}
            >
              {panelTitle}
            </span>
          </Link>
        </div>
        <nav
          className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4"
          aria-label="Разделы админки"
        >
          {full &&
            adminLinks.map(({ href, label }) => {
              const active = isActivePath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-cb-flame/12 text-white shadow-[inset_0_0_0_1px_rgba(255,49,49,0.25)]"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          {!full && (
            <Link
              href="/admin/support"
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                pathname.startsWith("/admin/support")
                  ? "bg-sky-500/15 text-sky-200 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.25)]"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              Обращения
            </Link>
          )}
        </nav>
        <div className="mt-auto space-y-2 border-t border-white/[0.06] p-4">
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-cb-flame"
          >
            Профиль и инвентарь
          </Link>
          {me?.isPartner ? (
            <Link
              href="/partner"
              className="block rounded-xl px-3 py-2 text-xs text-emerald-400/90 transition hover:bg-emerald-950/30"
            >
              Кабинет партнёра
            </Link>
          ) : null}
          <Link
            href="/"
            className="block rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-center text-xs font-semibold text-zinc-300 transition hover:border-cb-flame/30 hover:text-white"
          >
            На сайт
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
            {me?.isAdmin ? <AdminWithdrawalAlerts /> : null}
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

        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
