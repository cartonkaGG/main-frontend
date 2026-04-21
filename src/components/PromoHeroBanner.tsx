"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { normalizeHomeSlide, type HomeSlide } from "@/lib/slides";

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
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [slides, setSlides] = useState<HomeSlide[]>([]);

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
    heroCfg.bgImageUrl.trim().length > 0;
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
            <div className="relative flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-amber-200/35 bg-gradient-to-br from-[#ffb347] via-[#ff8c3a] to-[#e55d00] p-4 shadow-[0_20px_50px_-18px_rgba(0,0,0,0.9),0_0_0_1px_rgba(253,186,116,0.28),0_0_40px_-12px_rgba(249,115,22,0.4)] sm:rounded-[22px] sm:p-5">
              <div className="relative z-[1] flex min-w-0 flex-1 items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-black uppercase tracking-[0.1em] text-white drop-shadow-[0_2px_10px_rgba(12,74,110,0.45)] sm:text-base lg:text-lg">
                    Апгрейди свои скины!
                  </h3>
                  <Link
                    href="/upgrade"
                    className="mt-3 inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-white/35 bg-white/20 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_8px_24px_-12px_rgba(8,47,73,0.9)] transition hover:bg-white/30 sm:text-sm"
                  >
                    Апгрейд
                  </Link>
                </div>
                <div className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local decorative asset */}
                  <img
                    src="/upgrade-card-rifle.png"
                    alt="Скин для апгрейда"
                    className="h-auto w-[156px] origin-center object-contain transition-transform duration-300 ease-out hover:scale-[1.2] sm:w-[212px]"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </div>

            <Link
              href="/profile"
              className="group relative flex min-h-0 overflow-hidden rounded-[20px] bg-gradient-to-br from-[#1d8a54] via-[#136b43] to-[#0b4f32] p-4 shadow-[0_18px_44px_-16px_rgba(0,0,0,0.88)] sm:rounded-[22px] sm:p-5"
            >
              <span
                className="pointer-events-none absolute -bottom-10 -left-4 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl"
                aria-hidden
              />
              <div className="relative z-[1] flex min-w-0 flex-1 items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-black uppercase tracking-[0.1em] text-white sm:text-[15px]">
                    Выполняй миссии — забирай бонусы!
                  </h3>
                  <span className="mt-3 inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-white/20 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition group-hover:bg-white/25 sm:text-sm">
                    ПЕРЕЙТИ
                  </span>
                </div>
                <div className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local decorative asset */}
                  <img
                    src="/daily-bonus-chest.png"
                    alt="Бонусный сундук"
                    className="h-auto w-[96px] origin-center translate-y-4 scale-[1.75] object-contain transition-transform duration-300 ease-out group-hover:translate-y-4 group-hover:scale-[1.88] sm:w-[120px]"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
