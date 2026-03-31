/**
 * Steam economy image: суффикс размера для более высокого разрешения (острее на retina).
 */
const STEAM_ECONOMY = /\/economy\/image\//i;
const SIZE_SUFFIX = /\/\d+fx\d+f\/?$/i;

export function preferHighResSteamEconomyImage(url: string | null | undefined): string | null {
  if (url == null || typeof url !== "string") return null;
  const u = url.trim();
  if (!u) return null;
  if (!STEAM_ECONOMY.test(u)) return u;
  const [pathPart, ...rest] = u.split("?");
  const query = rest.length ? `?${rest.join("?")}` : "";
  const pathNoQuery = pathPart;
  if (SIZE_SUFFIX.test(pathNoQuery)) return u;
  const base = pathNoQuery.replace(/\/+$/, "");
  return `${base}/512fx512f${query}`;
}
