"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { apiFetch, getToken } from "@/lib/api";
import { requestSteamLoginRedirect } from "@/lib/steamLoginRedirect";
import { SiteMoney } from "@/components/SiteMoney";
import { useLiveDrops } from "@/hooks/useLiveDrops";
import { LiveDropsRail } from "@/components/LiveDropsRail";
import { CryptoTopUpModal } from "@/components/CryptoTopUpModal";
import { RoundedZapIcon } from "@/components/icons/RoundedZapIcon";
import { SITE_MONEY_CTA_COMPACT_CLASS, SITE_MONEY_CTA_TINY_CLASS } from "@/lib/siteMoneyStyles";
import { prefetchUpgradePageData } from "@/lib/upgradePrefetch";
import { NavbarNotifications } from "@/components/NavbarNotifications";
import { AdminWithdrawalAlerts } from "@/components/AdminWithdrawalAlerts";
import { GlobalLegalFooter } from "@/components/GlobalLegalFooter";
import { LegalAcceptanceRequiredModal } from "@/components/LegalAcceptanceRequiredModal";
import { NavbarUserMenu } from "@/components/NavbarUserMenu";

/** Дані шапки з легкого GET /api/me/session (без важкого /api/me). */
type Me = {
  displayName: string;
  avatar: string;
  balance: number;
  isAdmin?: boolean;
  isSupportStaff?: boolean;
  isPartner?: boolean;
};

type MeSessionApi = {
  displayName: string;
  avatar: string;
  balance?: number;
  isAdmin?: boolean;
  isSupportStaff?: boolean;
  isPartner?: boolean;
  needsLegalAcceptance?: boolean;
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

type SupportReplyToast = { ticketId: string; subject: string };

/** Плаваюча кнопка підтримки (fixed, правий нижній кут). */
function SupportFabLink() {
  const pathname = usePathname();
  if (pathname.startsWith("/support") || pathname.startsWith("/partner") || pathname.startsWith("/admin"))
    return null;
  return (
    <Link
      href="/support"
      aria-label="Поддержка"
      title="Поддержка"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-[100] flex h-14 w-14 items-center justify-center rounded-full border border-sky-500/40 bg-gradient-to-br from-sky-600/95 via-slate-900 to-slate-950 text-white shadow-[0_0_28px_rgba(56,189,248,0.35)] transition hover:border-sky-400/70 hover:brightness-110 focus-visible:outline focus-visible:ring-2 focus-visible:ring-sky-400/50"
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
  /** SSR і перший кадр без localStorage — не смикати шапку «гість → залогінений» */
  const [hasBrowserToken, setHasBrowserToken] = useState(false);
  const [cryptoTopUpOpen, setCryptoTopUpOpen] = useState(false);
  const [supportToast, setSupportToast] = useState<SupportReplyToast | null>(null);
  /** Старые аккаунты без legalAcceptance — блокируем сайт, пока не отметят все галочки. */
  const [needsLegalAcceptance, setNeedsLegalAcceptance] = useState(false);
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
      setNeedsLegalAcceptance(false);
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
        isPartner: r.data.isPartner,
      });
      setNeedsLegalAcceptance(Boolean(r.data.needsLegalAcceptance));
    } else {
      setMe(null);
      setNeedsLegalAcceptance(false);
    }
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

  const pathname = usePathname();
  const router = useRouter();
  const partnerDash = pathname.startsWith("/partner");
  const staffDash = partnerDash || pathname.startsWith("/admin");
  const upgradeActive = pathname.startsWith("/upgrade");
  const warmUpgradeNav = useCallback(() => {
    router.prefetch("/upgrade");
    prefetchUpgradePageData();
  }, [router]);

  return (
    <div className="relative flex w-full flex-col">
      {!staffDash && (
      <header className="z-10 flex min-h-[4.5rem] shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#050505]/90 px-[max(1rem,env(safe-area-inset-left,0px))] py-2.5 pt-[max(0.625rem,env(safe-area-inset-top,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:min-h-20 sm:gap-4 sm:px-6 sm:py-0 sm:pt-0">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4 lg:gap-8">
          <Link
            href="/"
            className="group flex shrink-0 cursor-pointer items-center gap-2.5 outline-none transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-500/50 opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100" />
              <RoundedZapIcon className="relative z-10 h-7 w-7 -skew-x-12 text-red-500 transition-transform duration-500 group-hover:scale-110 sm:h-9 sm:w-9" />
            </div>
            <span className="text-lg font-black tracking-tight text-white sm:text-2xl sm:text-[1.65rem]">
              Storm
              <span className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">Battle</span>
            </span>
          </Link>
          <Link
            href="/upgrade"
            prefetch
            onPointerEnter={warmUpgradeNav}
            onFocus={warmUpgradeNav}
            className={`group relative flex shrink-0 items-center gap-1.5 overflow-hidden rounded-lg border bg-gradient-to-b px-2.5 py-2 outline-none transition-all focus-visible:ring-2 focus-visible:ring-red-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] sm:gap-2 sm:px-4 ${
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
            <span className="relative z-10 text-[11px] font-bold uppercase tracking-wide text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.3)] sm:text-sm sm:tracking-wider">
              Апгрейд
            </span>
          </Link>
        </div>
        <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 text-sm sm:w-auto sm:gap-3">
          {me && (
            <div className="hidden items-stretch lg:flex">
              <div className="flex items-center gap-1.5 rounded-3xl bg-gradient-to-br from-zinc-950/95 via-cb-panel/35 to-black/90 p-1 pl-3 shadow-[inset_0_1px_0_rgba(255,49,49,0.1),0_4px_24px_rgba(0,0,0,0.35)]">
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
                  className={`${SITE_MONEY_CTA_COMPACT_CLASS} shrink-0 focus-visible:outline focus-visible:ring-2 focus-visible:ring-cb-flame/50 focus-visible:ring-offset-0`}
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
              <NavbarNotifications />
              {me.isAdmin ? <AdminWithdrawalAlerts /> : null}
              <button
                type="button"
                onClick={() => setCryptoTopUpOpen(true)}
                className={`${SITE_MONEY_CTA_TINY_CLASS} rounded-2xl lg:hidden`}
              >
                Пополнить
              </button>
            <NavbarUserMenu
              me={{
                displayName: me.displayName,
                avatar: me.avatar || "/logo.svg",
                balance: me.balance,
                isAdmin: me.isAdmin,
                isSupportStaff: me.isSupportStaff,
                isPartner: me.isPartner,
              }}
              variant="site"
            />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => requestSteamLoginRedirect()}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-gradient-to-r from-red-700 to-cb-flame px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-900/30 hover:brightness-110 active:brightness-95"
            >
              Steam
            </button>
          )}
        </div>
      </header>
      )}

      {supportToast && (
        <div
          className="border-b border-sky-500/40 bg-gradient-to-r from-sky-950/90 via-zinc-950/95 to-black px-[max(1rem,env(safe-area-inset-left,0px))] py-3 pr-[max(1rem,env(safe-area-inset-right,0px))] sm:px-6"
          role="status"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-400/90">Поддержка ответила</p>
              <p className="mt-0.5 truncate text-sm font-medium text-zinc-100">
                {supportToast.subject || "Ваше обращение"}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href={`/support/${encodeURIComponent(supportToast.ticketId)}`}
                className="rounded-xl bg-sky-600 px-4 py-2 text-center text-sm font-bold text-white transition hover:bg-sky-500"
                onClick={() => setSupportToast(null)}
              >
                Открыть переписку
              </Link>
              <button
                type="button"
                aria-label="Закрыть уведомление"
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-zinc-200"
                onClick={() => setSupportToast(null)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {staffDash ? (
        <div className="min-w-0 flex-1">{children}</div>
      ) : (
        <LiveDropsRail drops={drops}>{children}</LiveDropsRail>
      )}
      {!staffDash && <GlobalLegalFooter />}
      <CryptoTopUpModal
        open={cryptoTopUpOpen}
        onClose={() => setCryptoTopUpOpen(false)}
        onSuccess={() => setCryptoTopUpOpen(false)}
      />
      <LegalAcceptanceRequiredModal
        open={Boolean(hasBrowserToken && needsLegalAcceptance)}
        onCompleted={() => void loadMe()}
      />
      <SupportFabLink />
    </div>
  );
}
