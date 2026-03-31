"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CaseCard, type CaseSummary } from "@/components/CaseCard";
import { PromoHeroBanner } from "@/components/PromoHeroBanner";
import { SiteShell } from "@/components/SiteShell";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import { apiFetch } from "@/lib/api";

type SiteUiPublic = {
  homeCaseImageScale: number;
  homeSkinImageScale: number;
};

export function HomePage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [siteUi, setSiteUi] = useState<SiteUiPublic>({
    homeCaseImageScale: 100,
    homeSkinImageScale: 100,
  });
  /** Если /api/site-ui недоступен (часто — не перезапущен backend), пользователь остаётся на 100%. */
  const [siteUiLoadIssue, setSiteUiLoadIssue] = useState<string | null>(null);

  const loadCases = useCallback(async () => {
    const r = await apiFetch<{ cases: CaseSummary[] }>("/api/cases");
    if (!r.ok) {
      setError(r.error || "Не удалось загрузить кейсы");
      return;
    }
    setCases(r.data?.cases || []);
    setError(null);
  }, []);

  const loadSiteUi = useCallback(async () => {
    const r = await apiFetch<SiteUiPublic>("/api/site-ui");
    if (r.ok && r.data) {
      const d = r.data;
      const homeCaseImageScale =
        typeof d.homeCaseImageScale === "number" && Number.isFinite(d.homeCaseImageScale)
          ? d.homeCaseImageScale
          : 100;
      const homeSkinImageScale =
        typeof d.homeSkinImageScale === "number" && Number.isFinite(d.homeSkinImageScale)
          ? d.homeSkinImageScale
          : 100;
      setSiteUi({ homeCaseImageScale, homeSkinImageScale });
      setSiteUiLoadIssue(null);
      return;
    }
    const hint =
      r.status === 404
        ? "API без маршрута /api/site-ui — остановите старый процесс Node и перезапустите backend из актуального кода (npm run dev из корня репозитория)."
        : r.error || "Нет связи с API";
    if (process.env.NODE_ENV === "development") {
      console.warn("[StormBattle] Масштаб карточек на главной остаётся 100%:", hint);
    }
    setSiteUiLoadIssue(
      r.status === 404
        ? "Масштаб карточек на главной не применён (404 /api/site-ui). Перезапустите backend из актуального кода."
        : process.env.NODE_ENV === "development"
          ? hint
          : null,
    );
  }, []);

  useEffect(() => {
    loadCases();
    void loadSiteUi();
  }, [loadCases, loadSiteUi]);

  useEffect(() => {
    const h = () => loadCases();
    window.addEventListener("cd-cases-updated", h);
    return () => window.removeEventListener("cd-cases-updated", h);
  }, [loadCases]);

  useEffect(() => {
    const h = () => void loadSiteUi();
    window.addEventListener("cd-site-ui-updated", h);
    return () => window.removeEventListener("cd-site-ui-updated", h);
  }, [loadSiteUi]);

  const featured = cases.filter((c) => c.featured);

  const sectionKeys = useMemo(() => {
    const keys = new Set(cases.map((c) => c.category || "popular"));
    const ordered: string[] = CATEGORY_ORDER.filter((k) => k !== "all" && keys.has(k));
    const rest = Array.from(keys).filter((k) => !ordered.includes(k)).sort();
    return [...ordered, ...rest];
  }, [cases]);

  return (
    <SiteShell>
      <PromoHeroBanner />

      {siteUiLoadIssue && (
        <div className="border-b border-amber-500/35 bg-amber-950/40 px-4 py-2 text-center text-xs text-amber-200/95">
          {siteUiLoadIssue}
        </div>
      )}

      {featured.length > 0 && (
        <section className="border-t border-cb-stroke/80 bg-black/25 px-6 py-14">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-8 flex items-center gap-3 text-2xl font-bold text-white">
              <span className="h-1 w-10 rounded-full bg-gradient-to-r from-cb-flame to-transparent" />
              Рекомендуемые
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {featured.map((c) => (
                <CaseCard
                  key={c.slug}
                  c={c}
                  homeCaseScalePct={siteUi.homeCaseImageScale}
                  homeSkinScalePct={siteUi.homeSkinImageScale}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <section
        id="cases"
        className="scroll-mt-24 border-b border-cb-stroke bg-cb-panel/30 px-6 py-12"
      >
        <div className="mx-auto max-w-7xl">
          {error && <p className="mb-6 text-red-400">{error}</p>}
          {sectionKeys.map((key) => {
            const list = cases.filter((c) => (c.category || "popular") === key);
            if (!list.length) return null;
            return (
              <div key={key} className="mb-14 last:mb-0">
                <h2 className="mb-6 flex w-full items-center justify-center gap-4 text-xl font-bold text-white">
                  <span
                    aria-hidden
                    className="h-px min-w-8 flex-1 bg-gradient-to-r from-transparent to-cb-flame/90"
                  />
                  <span className="shrink-0 text-center">{CATEGORY_LABELS[key] || key}</span>
                  <span
                    aria-hidden
                    className="h-px min-w-8 flex-1 bg-gradient-to-l from-transparent to-cb-flame/90"
                  />
                </h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {list.map((c) => (
                    <CaseCard
                      key={c.slug}
                      c={c}
                      homeCaseScalePct={siteUi.homeCaseImageScale}
                      homeSkinScalePct={siteUi.homeSkinImageScale}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {!error && cases.length === 0 && (
            <p className="text-zinc-500">Пока нет кейсов.</p>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
