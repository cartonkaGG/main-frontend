"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { normalizeHomeSlide, type HomeSlide } from "@/lib/slides";

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
  const normalizedHref = href.trim();
  const isInternalPath = normalizedHref.startsWith("/") && !normalizedHref.startsWith("//");
  const isHttp = /^https?:\/\//i.test(normalizedHref);
  if (!isInternalPath) {
    return (
      <a
        href={normalizedHref}
        className={className}
        target={isHttp ? "_blank" : undefined}
        rel={isHttp ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={normalizedHref} className={className}>
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

const DEFAULT_HERO = {
  title: "Бесплатный бонус на баланс",
  subtitle: "",
  gradientFrom: "#0c1830",
  gradientVia: "#0a1424",
  gradientTo: "#050810",
  bgKind: "gradient" as const,
  bgImageUrl: "",
  bgImageOverlay: 0.55,
  buttons: [] as Array<{ label: string; href: string }>,
  carouselImageScalePct: 100,
};

type Props = {
  hero?: Partial<typeof DEFAULT_HERO>;
};

export function PromoHeroBanner({ hero }: Props) {
  const heroCfg = { ...DEFAULT_HERO, ...(hero || {}) };
  const [featured, setFeatured] = useState<FeaturedPromo | null>(null);
  const [copied, setCopied] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [slides, setSlides] = useState<HomeSlide[]>([]);

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

  const loadSlides = useCallback(async () => {
    const r = await apiFetch<{ slides?: unknown[] }>("/api/slides");
    if (!r.ok || !r.data?.slides) {
      setSlides([]);
      return;
    }
    const normalized = r.data.slides
      .map((s, i) => normalizeHomeSlide(s, i))
      .filter((s) => s.isActive)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    setSlides(normalized);
  }, []);

  useEffect(() => {
    void loadSlides();
  }, [loadSlides]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const h = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => void loadSlides(), 400);
    };
    window.addEventListener("cd-slides-updated", h);
    return () => {
      window.removeEventListener("cd-slides-updated", h);
      if (t) clearTimeout(t);
    };
  }, [loadSlides]);

  const displayCode = featured?.code || "";
  const depositPct = featured?.depositPercent ?? 0;
  const bonusPct = featured?.bonusPercent ?? 0;

  const isDepositPromo = featured?.rewardType === "depositPct" && depositPct > 0;
  const pctForDeposit = isDepositPromo ? Math.round(depositPct) : 0;
  const pctFallback = !isDepositPromo && bonusPct > 0 ? Math.round(bonusPct) : 0;
  const pctShown = pctForDeposit > 0 ? pctForDeposit : pctFallback;
  const promoHeadline =
    pctShown > 0 ? `Бонус к депозиту ${pctShown}%` : "Бонус к депозиту";

  const slidesLen = slides.length;
  const slidesActive = slidesLen > 0;
  const activeSlide = slidesActive ? slides[carouselIdx] : null;
  const titleShown = activeSlide?.title?.trim() || heroCfg.title;
  const subtitleShown = activeSlide?.subtitle?.trim() || heroCfg.subtitle;
  const slideButtonText = activeSlide?.buttonText?.trim() || "";
  const slideButtonLink = activeSlide?.buttonLink?.trim() || "";
  const mainButtons =
    slideButtonText && slideButtonLink
      ? [{ label: slideButtonText, href: slideButtonLink }]
      : heroCfg.buttons;
  const slideBgRaw = activeSlide?.backgroundImage?.trim() || "";
  const slideBgGradient =
    slideBgRaw.startsWith("linear-gradient(") || slideBgRaw.startsWith("radial-gradient(");
  const slideOverlayOpacity =
    activeSlide && Number.isFinite(activeSlide.overlayOpacity)
      ? Math.max(0, Math.min(0.9, activeSlide.overlayOpacity))
      : heroCfg.bgImageOverlay;
  const showImageBg =
    (slideBgRaw.length > 0 && !slideBgGradient) ||
    (heroCfg.bgKind === "image" && heroCfg.bgImageUrl.trim().length > 0);
  const bgImageUrl = slideBgRaw.length > 0 && !slideBgGradient ? slideBgRaw : heroCfg.bgImageUrl;

  const heroShellStyle = useMemo(() => {
    if (slideBgGradient) {
      return { background: slideBgRaw } as const;
    }
    if (showImageBg) return undefined;
    return {
      background: `linear-gradient(to bottom right, ${heroCfg.gradientFrom}, ${heroCfg.gradientVia}, ${heroCfg.gradientTo})`,
    } as const;
  }, [slideBgGradient, slideBgRaw, showImageBg, heroCfg.gradientFrom, heroCfg.gradientVia, heroCfg.gradientTo]);

  useEffect(() => {
    setCarouselIdx((i) => (slidesLen <= 0 ? 0 : Math.min(i, slidesLen - 1)));
  }, [slidesLen]);

  useEffect(() => {
    if (!slidesActive || slidesLen <= 1) return;
    const t = window.setInterval(() => {
      setCarouselIdx((i) => (i + 1) % slidesLen);
    }, 6000);
    return () => window.clearInterval(t);
  }, [slidesActive, slidesLen]);

  const goPrev = useCallback(() => {
    if (slidesLen <= 1) return;
    setCarouselIdx((i) => (i - 1 + slidesLen) % slidesLen);
  }, [slidesLen]);

  const goNext = useCallback(() => {
    if (slidesLen <= 1) return;
    setCarouselIdx((i) => (i + 1) % slidesLen);
  }, [slidesLen]);

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
                  style={{ backgroundImage: `url(${bgImageUrl})` }}
                  aria-hidden
                />
              </>
            ) : null}
            {slideOverlayOpacity > 0 ? (
              <div
                className="pointer-events-none absolute inset-0 bg-black"
                style={{ opacity: slideOverlayOpacity }}
                aria-hidden
              />
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
                  <h2 className="text-balance whitespace-pre-line text-xl font-black uppercase leading-tight tracking-tight text-white sm:text-2xl lg:text-3xl">
                    {titleShown}
                  </h2>
                  {subtitleShown ? (
                    <p className="mt-2 max-w-lg text-sm font-semibold uppercase leading-snug tracking-wide text-slate-300 sm:text-base">
                      {subtitleShown}
                    </p>
                  ) : null}
                </div>
                {slidesActive && slidesLen > 1 ? (
                  <div className="flex shrink-0 gap-1.5" role="tablist" aria-label="Слайды банера">
                    {slides.map((_, i) => (
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

              <div className="mt-3 flex min-h-0 flex-1 flex-col justify-end gap-3 sm:mt-4 sm:gap-4">
                {activeSlide?.foregroundImage ? (
                  <div className="relative flex min-h-[92px] min-w-0 flex-1 flex-col items-center justify-end sm:min-h-0 sm:max-w-[min(100%,420px)] sm:items-end">
                    <div className="relative flex h-full min-h-[92px] w-full max-w-full flex-col items-stretch justify-end overflow-hidden rounded-xl sm:min-h-0">
                      <div className="relative z-[1] flex min-h-0 flex-col items-center justify-end">
                        {/* eslint-disable-next-line @next/next/no-img-element -- зовнішні URL із адмінки */}
                        <img
                          key={`${activeSlide.foregroundImage}-${carouselIdx}`}
                          src={activeSlide.foregroundImage}
                          alt={activeSlide.title || "Banner image"}
                          className="h-auto max-h-[min(160px,28vh)] w-auto max-w-full object-contain object-bottom sm:max-h-[min(200px,30vh)] lg:max-h-[min(220px,32vh)]"
                          style={{
                            transform: `scale(${Math.min(180, Math.max(40, heroCfg.carouselImageScalePct || 100)) / 100})`,
                            transformOrigin: "bottom center",
                          }}
                          loading={carouselIdx === 0 ? "eager" : "lazy"}
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1" aria-hidden />
                )}
              </div>
              {mainButtons.length > 0 ? (
                <div className="mt-2 flex w-full shrink-0 flex-wrap justify-start gap-2 sm:mt-3">
                  {mainButtons.map((b) => (
                    <HeroCtaLink
                      key={`${b.href}-${b.label}`}
                      href={b.href}
                      className="inline-flex min-h-[3rem] w-auto max-w-full items-center justify-center rounded-xl border border-white/25 bg-white/15 px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_32px_-14px_rgba(0,0,0,0.9)] backdrop-blur-sm transition hover:bg-white/25 sm:min-h-[3.25rem] sm:px-6 sm:text-base"
                    >
                      {b.label}
                    </HeroCtaLink>
                  ))}
                </div>
              ) : null}
            </div>

            {slidesActive && slidesLen > 1 ? (
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
