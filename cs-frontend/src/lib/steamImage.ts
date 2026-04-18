/**
 * Steam economy image: розмір у шляху `/WxHf` (Steam CDN).
 * - sharp (512) — скіни в рулетці / інвентар, retina.
 * - compat (360) — найбезпечніше для «важких» economy URL (рідко 404).
 * - caseArt (448) — арт коробки на картці кейса: помітно чіткіше за 360, зазвичай без 404; якщо щось падає — повернути compat для цього URL у редакторі або тимчасово caseArt → compat у CaseCard.
 */
const STEAM_ECONOMY = /\/economy\/image\//i;
const SIZE_SUFFIX = /\/(\d+)fx(\d+)f\/?$/i;

const DIM_SHARP = 512;
const DIM_COMPAT = 360;
/** Між 360 і 512 для прев’ю кейсів на головній / у каталозі. */
const DIM_CASE_ART = 448;

export type SteamEconomyImageMode = "sharp" | "compat" | "caseArt";

export function preferHighResSteamEconomyImage(
  url: string | null | undefined,
  mode: SteamEconomyImageMode = "sharp",
): string | null {
  if (url == null || typeof url !== "string") return null;
  const u = url.trim();
  if (!u) return null;
  if (!STEAM_ECONOMY.test(u)) return u;

  const [pathPart, ...rest] = u.split("?");
  const query = rest.length ? `?${rest.join("?")}` : "";
  const base = pathPart.replace(/\/+$/, "");
  const m = base.match(SIZE_SUFFIX);

  if (mode === "compat") {
    const HI = DIM_COMPAT;
    if (m) {
      const w = Number(m[1]);
      const h = Number(m[2]);
      if (Number.isFinite(w) && Number.isFinite(h) && w === HI && h === HI) return u;
      const nextPath = base.replace(SIZE_SUFFIX, `/${HI}fx${HI}f`);
      return `${nextPath}${query}`;
    }
    return `${base}/${HI}fx${HI}f${query}`;
  }

  if (mode === "caseArt") {
    const HI = DIM_CASE_ART;
    if (m) {
      const w = Number(m[1]);
      const h = Number(m[2]);
      if (Number.isFinite(w) && Number.isFinite(h) && w === HI && h === HI) return u;
      const nextPath = base.replace(SIZE_SUFFIX, `/${HI}fx${HI}f`);
      return `${nextPath}${query}`;
    }
    return `${base}/${HI}fx${HI}f${query}`;
  }

  const HI = DIM_SHARP;
  if (m) {
    const w = Number(m[1]);
    const h = Number(m[2]);
    if (Number.isFinite(w) && Number.isFinite(h) && w >= HI && h >= HI) {
      return u;
    }
    const nextPath = base.replace(SIZE_SUFFIX, `/${HI}fx${HI}f`);
    return `${nextPath}${query}`;
  }

  return `${base}/${HI}fx${HI}f${query}`;
}

/** Додається до `object-contain` на зображеннях скінів: чіткіший даунскейл, окремий шар для GPU. */
export const SKIN_IMG_QUALITY_CLASS =
  "[transform:translateZ(0)] backface-hidden [-webkit-backface-visibility:hidden] [image-rendering:high-quality]";
