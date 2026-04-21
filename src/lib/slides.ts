export type HomeSlide = {
  id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  backgroundImage: string;
  foregroundImage: string;
  overlayOpacity: number;
  isActive: boolean;
  order: number;
  updatedAt?: string;
};

export const DEFAULT_HOME_SLIDE: HomeSlide = {
  id: "",
  title: "",
  subtitle: "",
  buttonText: "",
  buttonLink: "",
  backgroundImage: "",
  foregroundImage: "",
  overlayOpacity: 0.35,
  isActive: true,
  order: 0,
};

export function normalizeHomeSlide(raw: unknown, fallbackOrder = 0): HomeSlide {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    id: typeof o.id === "string" ? o.id : "",
    title: typeof o.title === "string" ? o.title : "",
    subtitle: typeof o.subtitle === "string" ? o.subtitle : "",
    buttonText: typeof o.buttonText === "string" ? o.buttonText : "",
    buttonLink: typeof o.buttonLink === "string" ? o.buttonLink : "",
    backgroundImage: typeof o.backgroundImage === "string" ? o.backgroundImage : "",
    foregroundImage: typeof o.foregroundImage === "string" ? o.foregroundImage : "",
    overlayOpacity:
      typeof o.overlayOpacity === "number" && Number.isFinite(o.overlayOpacity)
        ? Math.min(0.9, Math.max(0, o.overlayOpacity))
        : 0.35,
    isActive: o.isActive !== false,
    order:
      typeof o.order === "number" && Number.isFinite(o.order)
        ? Math.max(0, Math.round(o.order))
        : fallbackOrder,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : undefined,
  };
}
