import type { CaseSummary } from "@/components/CaseCard";
import { DEFAULT_HOME_PROMO_HERO, mergeHomePromoHero, type HomePromoHeroConfig } from "@/lib/siteUi";

export type HomeSiteUiBootstrap = {
  homeCaseImageScale: number;
  homeSkinImageScale: number;
  homePromoHero: HomePromoHeroConfig;
};

const DEFAULT_UI: HomeSiteUiBootstrap = {
  homeCaseImageScale: 100,
  homeSkinImageScale: 100,
  homePromoHero: DEFAULT_HOME_PROMO_HERO,
};

function apiBaseForServer(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000").replace(/\/$/, "");
  return raw;
}

/**
 * Дані для головної з сервера (HTML одразу з JSON каталогу — без очікування useEffect на клієнті).
 */
export async function fetchHomeBootstrap(): Promise<{
  cases: CaseSummary[] | undefined;
  siteUi: HomeSiteUiBootstrap | undefined;
}> {
  const base = apiBaseForServer();

  try {
    const [casesRes, uiRes] = await Promise.all([
      fetch(`${base}/api/cases`, {
        next: { revalidate: 45 },
        headers: { Accept: "application/json" },
      }),
      fetch(`${base}/api/site-ui`, {
        next: { revalidate: 120 },
        headers: { Accept: "application/json" },
      }),
    ]);

    let cases: CaseSummary[] | undefined;
    if (casesRes.ok) {
      const j = (await casesRes.json()) as { cases?: CaseSummary[] };
      cases = Array.isArray(j.cases) ? j.cases : [];
    }

    let siteUi: HomeSiteUiBootstrap | undefined;
    if (uiRes.ok) {
      const d = (await uiRes.json()) as Record<string, unknown>;
      const homeCaseImageScale =
        typeof d.homeCaseImageScale === "number" && Number.isFinite(d.homeCaseImageScale)
          ? d.homeCaseImageScale
          : DEFAULT_UI.homeCaseImageScale;
      const homeSkinImageScale =
        typeof d.homeSkinImageScale === "number" && Number.isFinite(d.homeSkinImageScale)
          ? d.homeSkinImageScale
          : DEFAULT_UI.homeSkinImageScale;
      const homePromoHero = mergeHomePromoHero(d.homePromoHero);
      siteUi = { homeCaseImageScale, homeSkinImageScale, homePromoHero };
    }

    return { cases, siteUi };
  } catch {
    return { cases: undefined, siteUi: undefined };
  }
}
