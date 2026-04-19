"use client";

import type { ReactNode } from "react";
import Image from "next/image";

const BANNER_CHARACTER = "/partner/partner-material-banner.png";

const PROMO_SKIN =
  "overflow-hidden rounded-lg border-2 border-white/30 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 px-5 py-3 shadow-xl will-change-transform sm:px-6 sm:py-3.5";

const PROMO_CARD_CLASS = `relative w-fit origin-center ${PROMO_SKIN}`;
/** Та сама картка по площі, що й лице (батько — inset 0 від коробки лиця). */
const PROMO_CARD_FILL_CLASS = `relative flex h-full min-h-0 w-full min-w-0 origin-center flex-col ${PROMO_SKIN}`;

function PromoGradientCard({ children, fill }: { children: ReactNode; fill?: boolean }) {
  return (
    <div
      className={fill ? PROMO_CARD_FILL_CLASS : PROMO_CARD_CLASS}
      style={{ animation: "partnerPromoPulse 2.2s ease-in-out infinite" }}
    >
      <div
        className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        style={{ animation: "partnerBannerShine 3s ease-in-out infinite" }}
      />
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      {children}
    </div>
  );
}

export type PartnerMaterialBannerProps = {
  /** Промокод (с API /api/partner/me → codes). Если есть — карточка периодически переворачивается и показывает код. */
  partnerPromoCode?: string | null;
};

/** Промо-баннер StormBattle для вкладки «Материал» у партнерському кабінеті. */
export function PartnerMaterialBanner({ partnerPromoCode = null }: PartnerMaterialBannerProps) {
  const promoCode = partnerPromoCode?.trim() ?? "";
  const flipEnabled = promoCode.length > 0;
  return (
    <div className="relative w-full max-w-5xl overflow-hidden rounded-xl bg-black shadow-[0_0_36px_rgba(220,38,38,0.25)] sm:rounded-2xl">
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

      <div className="relative z-10 grid grid-cols-1 gap-3 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 lg:grid-cols-12 lg:items-center lg:gap-4 lg:px-5 lg:py-4">
        {/* Логотип + назва — зліва */}
        <div className="flex flex-nowrap items-center justify-center gap-2 sm:gap-2.5 lg:col-span-3 lg:justify-start">
          <div className="relative shrink-0">
            <div className="absolute inset-0 blur-lg">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="#EF4444" />
              </svg>
            </div>
            <svg
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="relative animate-pulse"
              aria-hidden
            >
              <path
                d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
                fill="url(#partnerBannerLogoGradient)"
                stroke="#DC2626"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient
                  id="partnerBannerLogoGradient"
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

          <div className="min-w-0 text-center lg:text-left">
            <div className="flex flex-nowrap items-baseline justify-center gap-0 whitespace-nowrap leading-none lg:justify-start">
              <span className="text-3xl font-black tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] sm:text-4xl lg:text-5xl">
                Storm
              </span>
              <span className="bg-gradient-to-r from-red-500 via-red-600 to-orange-500 bg-clip-text text-3xl font-black tracking-tight text-transparent drop-shadow-lg sm:text-4xl lg:text-5xl">
                Battle
              </span>
            </div>
          </div>
        </div>

        {/* Получи +11% / к депозиту + переворот на промокод партнёра */}
        <div className="flex w-full justify-end lg:col-span-6 lg:pr-1">
          <div className="group relative w-fit max-w-none">
            <div className="absolute -inset-2 rounded-lg bg-gradient-to-r from-red-600 via-orange-500 to-red-600 opacity-45 blur-xl transition-opacity group-hover:opacity-60" />
            <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 opacity-30 blur-md" />

            {flipEnabled ? (
              <div className="relative [perspective:1200px]">
                <div
                  className="relative inline-block w-max [transform-style:preserve-3d]"
                  style={{
                    animation: "partnerPromoFlip 10s ease-in-out infinite",
                    willChange: "transform",
                  }}
                >
                  <div
                    className="relative z-[2] [backface-visibility:hidden] [transform:rotateY(0deg)]"
                    style={{ WebkitBackfaceVisibility: "hidden" }}
                  >
                    <PromoGradientCard>
                      <div className="relative">
                        <div className="flex flex-nowrap items-center justify-end gap-2.5 text-2xl font-black italic leading-none tracking-wide text-white drop-shadow-[0_4px_16px_rgba(0,0,0,1)] sm:text-3xl lg:text-4xl lg:-skew-x-6">
                          <span className="text-xl text-yellow-300 sm:text-2xl lg:text-3xl">★</span>
                          Получи +11%
                          <span className="text-xl text-yellow-300 sm:text-2xl lg:text-3xl">★</span>
                        </div>
                        <div className="mt-2 text-right text-sm font-bold uppercase leading-tight tracking-wider text-red-200/95 drop-shadow-md sm:text-base lg:text-lg">
                          к депозиту
                        </div>
                      </div>
                    </PromoGradientCard>
                  </div>

                  <div
                    className="absolute inset-0 z-[2] [backface-visibility:hidden] [transform:rotateY(180deg)]"
                    style={{ WebkitBackfaceVisibility: "hidden" }}
                  >
                    <PromoGradientCard fill>
                      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center text-center">
                        <div className="w-full min-w-0 font-mono text-2xl font-black uppercase not-italic leading-none tracking-wide text-white drop-shadow-[0_4px_16px_rgba(0,0,0,1)] sm:text-3xl lg:text-4xl">
                          <span className="line-clamp-2 break-all">{promoCode.toUpperCase()}</span>
                        </div>
                        <div className="mt-2 text-sm font-bold uppercase leading-tight tracking-wider text-red-200/95 drop-shadow-md sm:text-base lg:text-lg">
                          Промокод
                        </div>
                      </div>
                    </PromoGradientCard>
                  </div>
                </div>
              </div>
            ) : (
              <PromoGradientCard>
                <div className="relative">
                  <div className="flex flex-nowrap items-center justify-end gap-2.5 text-2xl font-black italic leading-none tracking-wide text-white drop-shadow-[0_4px_16px_rgba(0,0,0,1)] sm:text-3xl lg:text-4xl lg:-skew-x-6">
                    <span className="text-xl text-yellow-300 sm:text-2xl lg:text-3xl">★</span>
                    Получи +11%
                    <span className="text-xl text-yellow-300 sm:text-2xl lg:text-3xl">★</span>
                  </div>
                  <div className="mt-2 text-right text-sm font-bold uppercase leading-tight tracking-wider text-red-200/95 drop-shadow-md sm:text-base lg:text-lg">
                    к депозиту
                  </div>
                </div>
              </PromoGradientCard>
            )}
          </div>
        </div>

        {/* Персонаж — справа: scale + translate; overflow на банері hidden. */}
        <div className="flex justify-center lg:col-span-3 lg:justify-end lg:items-end">
          <div className="translate-x-0.5 translate-y-3 sm:translate-x-1 sm:translate-y-3.5 lg:translate-x-1.5 lg:translate-y-4 xl:translate-x-2 xl:translate-y-5">
            <div className="origin-bottom scale-[1.06] will-change-transform sm:scale-[1.1] lg:origin-bottom-right lg:scale-[1.12] xl:scale-[1.14]">
              <Image
                src={BANNER_CHARACTER}
                alt=""
                width={440}
                height={440}
                className="h-40 w-auto max-w-[min(100%,240px)] object-contain object-bottom drop-shadow-[0_0_28px_rgba(220,38,38,0.5)] sm:h-48 sm:max-w-[min(100%,280px)] lg:h-56 lg:max-w-none xl:h-60"
                unoptimized
              />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-1/2 h-px w-3/4 -translate-x-1/2 animate-pulse bg-gradient-to-r from-transparent via-red-600 to-transparent" />
      <div className="absolute bottom-2 left-2 h-6 w-6 border-b-2 border-l-2 border-red-600/40" />
      <div className="absolute bottom-2 right-2 h-6 w-6 border-b-2 border-r-2 border-red-600/40" />

      <style>{`
        @keyframes partnerBannerShine {
          0%, 100% { transform: translateX(-100%) skewX(-12deg); }
          50% { transform: translateX(200%) skewX(-12deg); }
        }
        @keyframes partnerPromoPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.07); }
        }
        @keyframes partnerPromoFlip {
          0%, 30% { transform: rotateY(0deg); }
          36%, 64% { transform: rotateY(180deg); }
          70%, 100% { transform: rotateY(360deg); }
        }
      `}</style>
    </div>
  );
}
