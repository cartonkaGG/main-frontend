"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RoundedZapIcon } from "@/components/icons/RoundedZapIcon";

/**
 * Звичайний блок у потоці документа: бренд, посилання «Поддержка», юридичні посилання, копірайт.
 */
export function GlobalLegalFooter() {
  const pathname = usePathname();
  const year = new Date().getFullYear();
  const linkClass =
    "text-right text-sm text-zinc-400 transition hover:text-cb-flame hover:underline underline-offset-2";
  const showSupport = !pathname.startsWith("/support");

  return (
    <footer
      className="border-t border-white/[0.08] bg-[#06060c]/95 px-[max(1rem,env(safe-area-inset-left,0px))] py-8 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] backdrop-blur-sm sm:px-6"
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex shrink-0 flex-col gap-3 self-start">
          <Link
            href="/"
            className="group flex cursor-pointer items-center gap-2.5 outline-none transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06060c] sm:gap-2.5"
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
          {showSupport ? (
            <Link
              href="/support"
              className="inline-flex w-fit items-center gap-2 text-sm font-medium text-sky-400/95 underline-offset-2 transition hover:text-sky-300 hover:underline"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-500/35 bg-sky-950/40 text-sky-200"
                aria-hidden
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-sky-300">
                  <path
                    d="M12 18a6 6 0 0 0 6-6V8a6 6 0 1 0-12 0v4a6 6 0 0 0 6 6Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path d="M8 14v2a4 4 0 0 0 8 0v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M12 18v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              Поддержка
            </Link>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-end sm:max-w-md">
          <p className="mb-3 w-full text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
            Общие положения
          </p>
          <nav className="flex w-full flex-col items-end gap-2.5" aria-label="Юридическая информация">
            <Link href="/legal/terms" className={linkClass}>
              Пользовательское соглашение
            </Link>
            <Link href="/legal/cookies" className={linkClass}>
              Политика использования Cookie
            </Link>
            <Link href="/legal/privacy" className={linkClass}>
              Политика конфиденциальности
            </Link>
          </nav>
          <p className="mt-8 w-full text-right text-xs text-zinc-600">
            © {year} StormBattle
          </p>
        </div>
      </div>
    </footer>
  );
}
