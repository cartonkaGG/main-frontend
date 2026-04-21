"use client";

import { useMemo } from "react";

export type PartnerMaterialWideTitleBannerProps = {
  /** Для фазы «ПО ПРОМОКОДУ : …»; если пусто — показывается «—». */
  partnerPromoCode?: string | null;
};

/**
 * Другий партнерський банер: той самий фон; циклічно — Storm Battle → +20% бонус → рядок з промокодом.
 */
export function PartnerMaterialWideTitleBanner({ partnerPromoCode = null }: PartnerMaterialWideTitleBannerProps) {
  const codeDisplay = useMemo(() => {
    const t = partnerPromoCode?.trim();
    return t && t.length > 0 ? t.toUpperCase() : "—";
  }, [partnerPromoCode]);

  return (
    <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-xl bg-black shadow-[0_0_36px_rgba(220,38,38,0.25)] sm:max-w-xl sm:rounded-2xl">
      <div className="absolute inset-0 bg-gradient-to-r from-black via-red-950/50 to-black" />

      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%23ef4444' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="absolute -left-32 -top-32 h-64 w-64 animate-pulse rounded-full bg-red-600/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-64 w-64 animate-pulse rounded-full bg-orange-600/20 blur-3xl delay-1000" />
      <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/10 blur-3xl" />

      <div className="absolute inset-0 opacity-10">
        <div className="absolute left-1/4 h-full w-px -skew-x-12 transform bg-gradient-to-b from-transparent via-red-500 to-transparent" />
        <div className="absolute right-1/3 h-full w-px -skew-x-12 transform bg-gradient-to-b from-transparent via-red-600 to-transparent" />
        <div className="absolute right-1/4 h-full w-px -skew-x-12 transform bg-gradient-to-b from-transparent via-orange-500 to-transparent" />
      </div>

      <div className="absolute left-1/4 top-8 h-2 w-2 animate-ping rounded-full bg-red-500/40" />
      <div className="absolute right-1/3 top-12 h-1 w-1 animate-ping rounded-full bg-orange-500/30 delay-500" />
      <div className="absolute bottom-8 left-1/3 h-1.5 w-1.5 animate-ping rounded-full bg-red-600/40 delay-1000" />
      <div className="absolute bottom-16 right-1/4 h-1 w-1 animate-ping rounded-full bg-orange-400/30 delay-700" />

      <div className="absolute left-16 top-10 text-xl text-green-500/20 animate-bounce">$</div>
      <div className="absolute right-20 top-20 text-2xl text-green-400/15 animate-bounce delay-300">$</div>
      <div className="absolute bottom-12 left-24 text-xl text-yellow-500/20 animate-bounce delay-500">★</div>

      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-red-600 to-transparent">
        <div className="absolute left-1/4 top-0 h-2 w-2 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
        <div className="absolute left-1/2 top-0 h-2 w-2 -translate-y-1/2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
        <div className="absolute right-1/4 top-0 h-2 w-2 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
      </div>

      <div className="absolute left-2 top-2 h-6 w-6 border-l-2 border-t-2 border-red-600/40" />
      <div className="absolute right-2 top-2 h-6 w-6 border-r-2 border-t-2 border-red-600/40" />

      <div className="relative z-10 flex w-full min-w-0 items-center justify-center px-3 py-6 sm:px-5 sm:py-8 md:py-10 lg:px-6 lg:py-10">
        <div className="relative min-h-[6.5rem] w-full min-w-0 sm:min-h-[7.5rem] md:min-h-[8.5rem]">
          {/* Фаза 1: Storm + Battle + блискавка */}
          <div
            className="absolute inset-0 flex min-w-0 flex-nowrap items-center justify-center gap-0"
            style={{ animation: "partnerWideTitlePhase1 15s ease-in-out infinite" }}
          >
            <div className="relative z-[1] flex shrink-0 translate-x-2 items-center justify-center self-center sm:translate-x-2.5 md:translate-x-3 md:-mr-3 lg:translate-x-3.5 lg:-mr-4">
              <div className="absolute inset-0 blur-lg">
                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="#EF4444" />
                </svg>
              </div>
              <svg
                width="72"
                height="72"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="relative h-12 w-12 animate-pulse sm:h-14 sm:w-14 md:h-16 md:w-16 lg:h-[4.25rem] lg:w-[4.25rem]"
                aria-hidden
              >
                <path
                  d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
                  fill="url(#partnerWideBannerLogoGradient)"
                  stroke="#DC2626"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient
                    id="partnerWideBannerLogoGradient"
                    x1="6.5"
                    y1="2"
                    x2="17.5"
                    y2="22"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#F97316" />
                    <stop offset="0.5" stopColor="#EF4444" />
                    <stop offset="1" stopColor="#DC2626" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="-ml-2 flex min-w-0 flex-1 flex-nowrap items-baseline leading-none sm:-ml-3 md:-ml-4 lg:-ml-5">
              <span className="min-w-0 flex-1 text-right font-black tracking-tight text-[clamp(1.35rem,7vw,3.75rem)] text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.45)] sm:tracking-tighter">
                Storm
              </span>
              <span className="min-w-0 flex-1 bg-gradient-to-r from-red-500 via-red-600 to-orange-500 bg-clip-text text-left font-black tracking-tight text-[clamp(1.35rem,7vw,3.75rem)] text-transparent drop-shadow-lg sm:tracking-tighter">
                Battle
              </span>
            </div>
          </div>

          {/* Фаза 2: +20% і К депозиту — один блок по центру */}
          <div
            className="pointer-events-none absolute inset-0 flex w-full min-w-0 flex-col items-center justify-center gap-1 px-4 text-center sm:gap-1.5 sm:px-6"
            style={{ animation: "partnerWideTitlePhase2 15s ease-in-out infinite" }}
          >
            <span className="font-black leading-none tracking-tight text-yellow-300 drop-shadow-[0_0_22px_rgba(250,204,21,0.5)] text-[clamp(2.25rem,9vw,3.75rem)] sm:text-6xl md:text-7xl">
              +20%
            </span>
            <span className="font-black uppercase leading-tight tracking-[0.12em] text-white drop-shadow-md text-sm sm:text-base md:text-lg">
              К депозиту
            </span>
          </div>

          {/* Фаза 3: промокод — підпис + код, по центру */}
          <div
            className="pointer-events-none absolute inset-0 flex w-full min-w-0 flex-col items-center justify-center gap-2 px-4 text-center sm:gap-2.5 sm:px-6"
            style={{ animation: "partnerWideTitlePhase3 15s ease-in-out infinite" }}
          >
            <span className="font-black uppercase leading-none tracking-[0.2em] text-zinc-300 drop-shadow text-xs sm:text-sm">
              Промокод
            </span>
            <span className="max-w-full break-words font-mono font-black uppercase leading-none tracking-wide text-yellow-300 drop-shadow-[0_0_16px_rgba(250,204,21,0.45)] text-[clamp(1.75rem,7.5vw,4.25rem)] sm:text-4xl md:text-5xl lg:text-6xl">
              {codeDisplay}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-1/2 h-px w-3/4 -translate-x-1/2 animate-pulse bg-gradient-to-r from-transparent via-red-600 to-transparent" />
      <div className="absolute bottom-2 left-2 h-6 w-6 border-b-2 border-l-2 border-red-600/40" />
      <div className="absolute bottom-2 right-2 h-6 w-6 border-b-2 border-r-2 border-red-600/40" />

      <style>{`
        @keyframes partnerWideTitlePhase1 {
          0%, 4% { opacity: 0; transform: translateY(12px); }
          8%, 28% { opacity: 1; transform: translateY(0); }
          33%, 100% { opacity: 0; transform: translateY(-14px); }
        }
        @keyframes partnerWideTitlePhase2 {
          0%, 33% { opacity: 0; transform: scale(0.94); }
          38%, 58% { opacity: 1; transform: scale(1); }
          63%, 100% { opacity: 0; transform: scale(0.96); }
        }
        @keyframes partnerWideTitlePhase3 {
          0%, 63% { opacity: 0; transform: translateY(10px); }
          68%, 90% { opacity: 1; transform: translateY(0); }
          95%, 100% { opacity: 0; transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
