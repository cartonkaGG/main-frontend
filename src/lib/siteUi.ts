/** Публічні поля з GET /api/site-ui (без курсів тощо, що лише для адміна). */

export type HomePromoHeroButton = {
  label: string;
  href: string;
};

/** Слайд каруселі на банері (PNG/JPG з https, зокрема imgbb; прозорість PNG зберігається). */
export type HomePromoHeroCarouselSlide = {
  imageUrl: string;
  alt: string;
  /** Порожньо — зображення не посилання */
  href: string;
  /** Текст на слайді (показується над зображенням) */
  caption: string;
  /** Фон області слайду за персонажем/картинкою */
  slideBgKind: "none" | "gradient" | "image";
  slideGradientFrom: string;
  slideGradientVia: string;
  slideGradientTo: string;
  slideBgImageUrl: string;
  /** Затемнення поверх фото-фону слайду (0…0.95) */
  slideBgOverlay: number;
};

export const DEFAULT_CAROUSEL_SLIDE_FIELDS: Omit<
  HomePromoHeroCarouselSlide,
  "imageUrl" | "alt" | "href"
> = {
  caption: "",
  slideBgKind: "none",
  slideGradientFrom: "#0c1830",
  slideGradientVia: "#0a1424",
  slideGradientTo: "#050810",
  slideBgImageUrl: "",
  slideBgOverlay: 0.45,
};

export type HomePromoHeroConfig = {
  title: string;
  subtitle: string;
  bgKind: "gradient" | "image";
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  bgImageUrl: string;
  /** Затемнення поверх фото (0…0.95) для читабельності тексту */
  bgImageOverlay: number;
  buttons: HomePromoHeroButton[];
  /** Карусель картинок у блоці банера (праворуч від таймера) */
  carouselEnabled: boolean;
  carouselSlides: HomePromoHeroCarouselSlide[];
  /** Масштаб зображення слайду на банері, % */
  carouselImageScalePct: number;
};

export const DEFAULT_HOME_PROMO_HERO: HomePromoHeroConfig = {
  title: "Бесплатный бонус на баланс",
  subtitle: "НА СЧЁТ",
  bgKind: "gradient",
  gradientFrom: "#0c1830",
  gradientVia: "#0a1424",
  gradientTo: "#050810",
  bgImageUrl: "",
  bgImageOverlay: 0.55,
  buttons: [],
  carouselEnabled: false,
  carouselSlides: [],
  carouselImageScalePct: 100,
};

/** Клієнтський fallback, якщо API повернув неповний об’єкт. */
export function mergeHomePromoHero(raw: unknown): HomePromoHeroConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_HOME_PROMO_HERO };
  }
  const o = raw as Partial<HomePromoHeroConfig>;
  const buttons = Array.isArray(o.buttons)
    ? o.buttons
        .filter(
          (b): b is Record<string, unknown> =>
            !!b && typeof b === "object" && typeof (b as { href?: string }).href === "string",
        )
        .map((b) => {
          const href = String((b as { href: string }).href);
          const labelRaw = (b as { label?: unknown }).label;
          const label =
            typeof labelRaw === "string" && labelRaw.trim().length > 0 ? labelRaw.trim() : "Перейти";
          return { label, href } satisfies HomePromoHeroButton;
        })
    : DEFAULT_HOME_PROMO_HERO.buttons;
  const carouselSlides: HomePromoHeroCarouselSlide[] = (
    Array.isArray(o.carouselSlides) ? o.carouselSlides : []
  )
    .map((s) => {
      if (!s || typeof s !== "object") return null;
      const r = s as Record<string, unknown>;
      const imageUrl = typeof r.imageUrl === "string" ? r.imageUrl.trim() : "";
      if (!imageUrl) return null;
      const alt = typeof r.alt === "string" ? r.alt.trim().slice(0, 120) : "";
      const href = typeof r.href === "string" ? r.href.trim().slice(0, 512) : "";
      const caption = typeof r.caption === "string" ? r.caption.trim().slice(0, 160) : "";
      const slideBgKind =
        r.slideBgKind === "gradient" || r.slideBgKind === "image" ? r.slideBgKind : "none";
      const slideGradientFrom =
        typeof r.slideGradientFrom === "string" && r.slideGradientFrom.trim()
          ? r.slideGradientFrom.trim().slice(0, 16)
          : DEFAULT_CAROUSEL_SLIDE_FIELDS.slideGradientFrom;
      const slideGradientVia =
        typeof r.slideGradientVia === "string" && r.slideGradientVia.trim()
          ? r.slideGradientVia.trim().slice(0, 16)
          : DEFAULT_CAROUSEL_SLIDE_FIELDS.slideGradientVia;
      const slideGradientTo =
        typeof r.slideGradientTo === "string" && r.slideGradientTo.trim()
          ? r.slideGradientTo.trim().slice(0, 16)
          : DEFAULT_CAROUSEL_SLIDE_FIELDS.slideGradientTo;
      const slideBgImageUrl =
        typeof r.slideBgImageUrl === "string" ? r.slideBgImageUrl.trim().slice(0, 2048) : "";
      const ov = Number(r.slideBgOverlay);
      const slideBgOverlay =
        Number.isFinite(ov) && ov >= 0 ? Math.min(0.95, Math.max(0, ov)) : DEFAULT_CAROUSEL_SLIDE_FIELDS.slideBgOverlay;
      return {
        imageUrl,
        alt,
        href,
        caption,
        slideBgKind,
        slideGradientFrom,
        slideGradientVia,
        slideGradientTo,
        slideBgImageUrl,
        slideBgOverlay,
      };
    })
    .filter((x): x is HomePromoHeroCarouselSlide => x != null);

  const cisp = Number(o.carouselImageScalePct);
  const carouselImageScalePct =
    Number.isFinite(cisp) && cisp > 0
      ? Math.min(180, Math.max(40, Math.round(cisp)))
      : DEFAULT_HOME_PROMO_HERO.carouselImageScalePct;

  const carouselEnabled = (() => {
    if (!o || typeof o !== "object" || !("carouselEnabled" in o)) {
      return DEFAULT_HOME_PROMO_HERO.carouselEnabled;
    }
    const v = (o as Record<string, unknown>).carouselEnabled;
    if (typeof v === "boolean") return v;
    if (v === "true" || v === 1) return true;
    if (v === "false" || v === 0) return false;
    return DEFAULT_HOME_PROMO_HERO.carouselEnabled;
  })();

  return {
    ...DEFAULT_HOME_PROMO_HERO,
    ...o,
    bgKind: o.bgKind === "image" ? "image" : "gradient",
    buttons,
    carouselEnabled,
    carouselSlides,
    carouselImageScalePct,
  };
}

export type SiteUiPublic = {
  homeCaseImageScale: number;
  homeSkinImageScale: number;
  homePromoHero: HomePromoHeroConfig;
};
