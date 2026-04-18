"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import type { HomePromoHeroCarouselSlide, HomePromoHeroConfig } from "@/lib/siteUi";

type FeaturedPromo = {
  id: string;
  code: string;
  bonusPercent: number;
  bannerSubline: string;
  endsAt: string | null;
  hasReward: boolean;
  rewardType?: "balance" | "depositPct";
  depositPercent?: number;
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatRemaining(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function formatCodeDisplay(code: string) {
  const raw = code.replace(/[\s-]+/g, "").toUpperCase();
  if (raw.length >= 10 && raw.length % 2 === 0) {
    const mid = raw.length / 2;
    return `${raw.slice(0, mid)}-${raw.slice(mid)}`;
  }
  return code;
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M8 4.75A2.25 2.25 0 0 1 10.25 2.5h7A2.25 2.25 0 0 1 19.5 4.75v7a2.25 2.25 0 0 1-2.25 2.25H15v1.5A2.25 2.25 0 0 1 12.75 18h-7A2.25 2.25 0 0 1 3.5 15.75v-7A2.25 2.25 0 0 1 5.75 6.25H8v-1.5Zm1.5 0v1.5h3.75A2.25 2.25 0 0 1 15.5 8.5v3.75h1.5V4.75A.75.75 0 0 0 16.25 4h-7a.75.75 0 0 0-.75.75ZM5.75 7.75a.75.75 0 0 0-.75.75v7c0 .414.336.75.75.75h7a.75.75 0 0 0 .75-.75v-7a.75.75 0 0 0-.75-.75h-7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function HeroCtaLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const ext = /^https?:\/\//i.test(href);
  if (ext) {
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4Zm-2 6V6a2 2 0 1 1 4 0v2h-4Z"
        fill="currentColor"
      />
    </svg>
  );
}

type Props = {
  hero: HomePromoHeroConfig;
};

export function PromoHeroBanner({ hero }: Props) {
  const [featured, setFeatured] = useState<FeaturedPromo | null>(null);
  const [tick, setTick] = useState(0);
  const [copied, setCopied] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);

  const loadFeatured = useCallback(async () => {
    const r = await apiFetch<{ promo: FeaturedPromo | null }>("/api/promo/featured");
    if (r.ok) setFeatured(r.data?.promo ?? null);
  }, []);

  useEffect(() => {
    loadFeatured();
  }, [loadFeatured]);

  useEffect(() => {
    const h = () => loadFeatured();
    window.addEventListener("cd-promos-updated", h);
    return () => window.removeEventListener("cd-promos-updated", h);
  }, [loadFeatured]);

  useEffect(() => {
    if (!featured?.endsAt) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [featured?.endsAt]);

  const endsMs = featured?.endsAt ? new Date(featured.endsAt).getTime() : null;
  const remaining =
    endsMs != null && Number.isFinite(endsMs)
      ? endsMs - Date.now() + 0 * tick
      : null;

  const displayCode = featured?.code || "";
  const depositPct = featured?.depositPercent ?? 0;
  const bonusPct = featured?.bonusPercent ?? 0;

  const isDepositPromo = featured?.rewardType === "depositPct" && depositPct > 0;
  const pctForDeposit = isDepositPromo ? Math.round(depositPct) : 0;
  const pctFallback = !isDepositPromo && bonusPct > 0 ? Math.round(bonusPct) : 0;
  const pctShown = pctForDeposit > 0 ? pctForDeposit : pctFallback;
  const promoHeadline =
    pctShown > 0 ? `Бонус к депозиту ${pctShown}%` : "Бонус к депозиту";

  const showImageBg = hero.bgKind === "image" && hero.bgImageUrl.trim().length > 0;

  const heroShellStyle = useMemo(() => {
    if (showImageBg) return undefined;
    return {
      background: `linear-gradient(to bottom right, ${hero.gradientFrom}, ${hero.gradientVia}, ${hero.gradientTo})`,
    } as const;
  }, [hero.gradientFrom, hero.gradientVia, hero.gradientTo, showImageBg]);

  /** Лише явний true — уникаємо truthy-рядків / Boolean("false") з API. */
  const carouselEnabledStrict = hero.carouselEnabled === true;

  const carouselSlides = useMemo(() => {
    if (!carouselEnabledStrict) return [];
    const list = Array.isArray(hero.carouselSlides) ? hero.carouselSlides : [];
    return list.filter((s) => {
      const u = typeof s?.imageUrl === "string" ? s.imageUrl.trim() : "";
      return u.length > 0;
    }) as HomePromoHeroCarouselSlide[];
  }, [carouselEnabledStrict, hero.carouselSlides]);

  const carouselLen = carouselSlides.length;
  const carouselActive = carouselLen > 0;

  useEffect(() => {
    setCarouselIdx((i) => (carouselLen <= 0 ? 0 : Math.min(i, carouselLen - 1)));
  }, [carouselLen]);

  useEffect(() => {
    if (!carouselActive || carouselLen <= 1) return;
    const t = window.setInterval(() => {
      setCarouselIdx((i) => (i + 1) % carouselLen);
    }, 7000);
    return () => window.clearInterval(t);
  }, [carouselActive, carouselLen]);

  const goPrev = useCallback(() => {
    if (carouselLen <= 1) return;
    setCarouselIdx((i) => (i - 1 + carouselLen) % carouselLen);
  }, [carouselLen]);

  const goNext = useCallback(() => {
    if (carouselLen <= 1) return;
    setCarouselIdx((i) => (i + 1) % carouselLen);
  }, [carouselLen]);

  const copyCode = useCallback(async () => {
    if (!displayCode) return;
    try {
      await navigator.clipboard.writeText(displayCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [displayCode]);

  return (
    <section className="relative px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
      <div className="relative mx-auto max-w-7xl">
        {/* stretch: одна висота з правою колонкою; h-full — ліва картка заповнює комірку сітки */}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)] lg:items-stretch lg:gap-4">
          {/* Головний банер (контент і фон з адмінки → site-ui) */}
          <div
            className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-white/10 p-3 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.85)] sm:rounded-[24px] sm:p-4"
            style={heroShellStyle}
          >
            {showImageBg ? (
              <>
                <div
                  className="pointer-events-none absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${hero.bgImageUrl})` }}
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-black"
                  style={{ opacity: hero.bgImageOverlay }}
                  aria-hidden
                />
              </>
            ) : null}
            <div
              className="pointer-events-none absolute -right-12 top-1/2 z-0 h-48 w-48 -translate-y-1/2 rounded-full bg-sky-500/10 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute bottom-0 left-0 z-0 h-32 w-32 rounded-full bg-blue-600/10 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 z-0 opacity-[0.15]"
              style={{
                backgroundImage: `
                  linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px),
                  linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)
                `,
                backgroundSize: "32px 32px",
              }}
              aria-hidden
            />

            <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-balance text-base font-black uppercase leading-snug tracking-tight text-white sm:text-lg">
                    {hero.title}
                  </h2>
                  <p className="mt-1 max-w-lg text-xs font-semibold uppercase leading-snug tracking-wide text-slate-400 sm:text-sm">
                    {hero.subtitle}
                  </p>
                </div>
                {carouselActive && carouselLen > 1 ? (
                  <div className="flex shrink-0 gap-1.5" role="tablist" aria-label="Слайды банера">
                    {carouselSlides.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        role="tab"
                        aria-selected={i === carouselIdx}
                        onClick={() => setCarouselIdx(i)}
                        className={`h-2 w-2 rounded-full transition ${i === carouselIdx ? "bg-white" : "bg-white/25 hover:bg-white/40"}`}
                        aria-label={`Слайд ${i + 1}`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              {hero.buttons.length > 0 ? (
                <div className="mt-2.5 flex shrink-0 flex-wrap gap-2 sm:gap-2">
                  {hero.buttons.map((b) => (
                    <HeroCtaLink
                      key={`${b.href}-${b.label}`}
                      href={b.href}
                      className="inline-flex min-h-[2.25rem] items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-white shadow backdrop-blur-sm transition hover:bg-white/20 sm:min-h-[2.5rem] sm:px-4 sm:text-xs"
                    >
                      {b.label}
                    </HeroCtaLink>
                  ))}
                </div>
              ) : null}

              <div className="mt-auto flex min-h-0 flex-col justify-end gap-3 pt-2 sm:mt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                <div className="flex min-w-0 shrink-0 flex-col justify-end">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-sky-300/90 sm:text-[10px]">
                    Осталось времени
                  </p>
                  <p className="mt-0.5 font-mono text-xl font-bold tabular-nums tracking-wide text-white sm:text-2xl">
                    {featured && remaining == null
                      ? "Бессрочно"
                      : remaining != null && remaining <= 0
                        ? "00:00:00"
                        : remaining != null
                          ? formatRemaining(remaining)
                          : "— — —"}
                  </p>
                  {remaining != null && remaining <= 0 && featured && (
                    <p className="mt-1 text-xs font-medium text-red-400/90">Акция завершена</p>
                  )}
                  {featured && remaining == null && (
                    <p className="mt-1 text-xs text-zinc-500">Без дедлайна</p>
                  )}
                </div>

                {carouselActive ? (
                  <div className="relative flex min-h-[92px] min-w-0 flex-1 flex-col items-center justify-end sm:min-h-0 sm:max-w-[min(100%,420px)] sm:items-end">
                    <div className="relative flex h-full min-h-[92px] w-full max-w-full flex-col items-stretch justify-end overflow-hidden rounded-xl sm:min-h-0">
                      {(() => {
                        const slide = carouselSlides[carouselIdx];
                        if (!slide) return null;
                        const scale = Math.min(180, Math.max(40, hero.carouselImageScalePct || 100)) / 100;
                        const bgKind = slide.slideBgKind ?? "none";
                        const gFrom = slide.slideGradientFrom ?? "#0c1830";
                        const gVia = slide.slideGradientVia ?? "#0a1424";
                        const gTo = slide.slideGradientTo ?? "#050810";
                        const showSlideGrad = bgKind === "gradient";
                        const showSlideImg =
                          bgKind === "image" && (slide.slideBgImageUrl ?? "").trim().length > 0;
                        const slideOv =
                          typeof slide.slideBgOverlay === "number" && Number.isFinite(slide.slideBgOverlay)
                            ? Math.min(0.95, Math.max(0, slide.slideBgOverlay))
                            : 0.45;
                        const cap = (slide.caption ?? "").trim();

                        const inner = (
                          // eslint-disable-next-line @next/next/no-img-element -- довільні https URL з адмінки (imgbb, PNG з альфою)
                          <img
                            key={`${slide.imageUrl}-${carouselIdx}`}
                            src={slide.imageUrl.trim()}
                            alt={slide.alt?.trim() || ""}
                            className="h-auto max-h-[min(160px,28vh)] w-auto max-w-full object-contain object-bottom sm:max-h-[min(200px,30vh)] lg:max-h-[min(220px,32vh)]"
                            style={{
                              transform: `scale(${scale})`,
                              transformOrigin: "bottom center",
                            }}
                            loading={carouselIdx === 0 ? "eager" : "lazy"}
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                        );

                        return (
                          <>
                            {showSlideGrad ? (
                              <div
                                className="pointer-events-none absolute inset-0 z-0"
                                style={{
                                  background: `linear-gradient(to bottom right, ${gFrom}, ${gVia}, ${gTo})`,
                                }}
                                aria-hidden
                              />
                            ) : null}
                            {showSlideImg ? (
                              <>
                                <div
                                  className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center"
                                  style={{
                                    backgroundImage: `url(${(slide.slideBgImageUrl ?? "").trim()})`,
                                  }}
                                  aria-hidden
                                />
                                <div
                                  className="pointer-events-none absolute inset-0 z-0 bg-black"
                                  style={{ opacity: slideOv }}
                                  aria-hidden
                                />
                              </>
                            ) : null}
                            {cap ? (
                              <p className="relative z-[2] px-2 pb-1 pt-2 text-center text-[10px] font-black uppercase leading-snug tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] sm:text-[11px]">
                                {cap}
                              </p>
                            ) : null}
                            <div className="relative z-[1] flex min-h-0 flex-col items-center justify-end">
                              {slide.href ? (
                                <HeroCtaLink
                                  href={slide.href.trim()}
                                  className="flex max-h-full max-w-full items-end justify-center outline-none ring-offset-2 ring-offset-transparent focus-visible:ring-2 focus-visible:ring-cb-flame/60"
                                >
                                  {inner}
                                </HeroCtaLink>
                              ) : (
                                <div className="flex max-h-full max-w-full items-end justify-center">{inner}</div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {carouselActive && carouselLen > 1 ? (
              <div className="absolute bottom-3 right-3 z-[2] flex items-center gap-1.5 sm:bottom-4 sm:right-4">
                <button
                  type="button"
                  onClick={goPrev}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/40 text-base text-white/90 backdrop-blur-sm transition hover:bg-black/55 sm:h-9 sm:w-9"
                  aria-label="Предыдущий слайд"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/40 text-base text-white/90 backdrop-blur-sm transition hover:bg-black/55 sm:h-9 sm:w-9"
                  aria-label="Следующий слайд"
                >
                  ›
                </button>
              </div>
            ) : null}
          </div>

          {/* Промокод + щоденний бонус (палітра cb-* як на сайті) */}
          <div className="flex min-h-0 flex-col gap-3 lg:h-full">
            <div className="relative flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-cb-stroke/90 bg-cb-panel/95 bg-cb-mesh p-4 shadow-[0_20px_50px_-18px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,49,49,0.12),0_0_40px_-12px_rgba(255,49,49,0.12)] sm:rounded-[22px] sm:p-5">
              <span
                className="pointer-events-none absolute -right-1 top-1/2 -translate-y-1/2 select-none text-[5.5rem] font-black leading-none text-cb-flame/[0.07] sm:text-[6.5rem]"
                aria-hidden
              >
                %
              </span>

              <div className="relative z-[1] flex flex-1 flex-col">
                {displayCode ? (
                  <>
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <h3 className="min-w-0 text-sm font-black uppercase leading-snug tracking-[0.1em] text-white sm:flex-1 sm:text-base sm:tracking-[0.12em] lg:text-lg">
                        {promoHeadline}
                      </h3>
                      <div className="w-full max-w-[16rem] shrink-0 self-end rounded-xl border border-cb-flame/45 bg-gradient-to-b from-black/70 to-zinc-950/90 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_28px_-6px_rgba(255,49,49,0.28)] ring-1 ring-cb-flame/20 sm:w-auto sm:max-w-[min(100%,13rem)] sm:self-auto sm:px-3.5 sm:py-2.5 lg:max-w-[14rem]">
                        <p
                          className="select-all text-right font-mono text-[13px] font-bold uppercase tracking-[0.18em] text-white drop-shadow-[0_0_14px_rgba(255,49,49,0.45)] sm:text-sm sm:tracking-[0.22em]"
                          title={formatCodeDisplay(displayCode)}
                        >
                          {formatCodeDisplay(displayCode)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyCode()}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-900 to-cb-flame py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[0_8px_24px_rgba(255,49,49,0.22)] transition hover:brightness-110 active:scale-[0.99] sm:py-3 sm:text-sm"
                    >
                      <CopyIcon className="h-4 w-4 shrink-0 opacity-95" />
                      {copied ? "Скопировано" : "Скопировать"}
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-black uppercase leading-snug tracking-[0.1em] text-white sm:text-base sm:tracking-[0.12em] lg:text-lg">
                      {promoHeadline}
                    </h3>
                    <p className="mt-2 flex-1 text-xs leading-relaxed text-zinc-500 sm:text-sm">
                      Главный промокод не назначен. Админ может включить «на баннер» в разделе промокодов.
                    </p>
                  </>
                )}
              </div>
            </div>

            <Link
              href="/profile"
              className="group relative flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-cb-stroke/85 bg-cb-panel/95 bg-cb-mesh p-4 shadow-[0_18px_44px_-16px_rgba(0,0,0,0.88),0_0_0_1px_rgba(255,49,49,0.1)] sm:rounded-[22px] sm:p-5"
            >
              <span
                className="pointer-events-none absolute -bottom-8 -right-6 h-32 w-32 rounded-full bg-cb-flame/12 blur-3xl"
                aria-hidden
              />
              <h3 className="relative text-xs font-black uppercase tracking-[0.12em] text-white sm:text-[13px]">
                Ежедневный бонус
              </h3>
              <p className="relative mt-1 text-xs font-medium text-cb-flame/90 sm:text-sm">Уже доступен!</p>
              <span className="relative mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-gradient-to-r from-red-900 to-cb-flame py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-[0_8px_22px_rgba(255,49,49,0.2)] transition hover:brightness-110 sm:mt-4 sm:py-3 sm:text-sm">
                <LockIcon className="h-4 w-4 shrink-0 opacity-95" />
                Получить
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
