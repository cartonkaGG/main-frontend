"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CaseCard, type CaseSummary } from "@/components/CaseCard";
import { PartnersLegalFooter } from "@/components/PartnersLegalFooter";
import { PromoHeroBanner } from "@/components/PromoHeroBanner";
import { SiteShell } from "@/components/SiteShell";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import { apiFetch } from "@/lib/api";

/** Скільки перших карток у сітці отримують preload / важчі прев’ю (LCP і верх каталогу). */
const HOME_CARD_IMAGE_PRELOAD = 10;

type Props = {
  /** З SSR: каталог уже в HTML, картинки стартують одразу. undefined — з клієнта підвантажити /api/cases */
  initialCases?: CaseSummary[];
};

export function HomePage({ initialCases }: Props) {
  const [cases, setCases] = useState<CaseSummary[]>(() => initialCases ?? []);
  const [error, setError] = useState<string | null>(null);

  const loadCases = useCallback(async () => {
    const r = await apiFetch<{ cases: CaseSummary[] }>("/api/cases");
    if (!r.ok) {
      setError(r.error || "Не удалось загрузить кейсы");
      return;
    }
    setCases(r.data?.cases || []);
    setError(null);
  }, []);

  useEffect(() => {
    if (initialCases === undefined) void loadCases();
  }, [initialCases, loadCases]);

  useEffect(() => {
    const h = () => loadCases();
    window.addEventListener("cd-cases-updated", h);
    return () => window.removeEventListener("cd-cases-updated", h);
  }, [loadCases]);

  const featured = useMemo(() => {
    return cases
      .filter((c) => c.featured)
      .sort(
        (a, b) =>
          (a.homeOrder ?? 0) - (b.homeOrder ?? 0) ||
          a.slug.localeCompare(b.slug),
      );
  }, [cases]);

  const sectionKeys = useMemo(() => {
    const keys = new Set(cases.map((c) => c.category || "popular"));
    const ordered: string[] = CATEGORY_ORDER.filter((k) => k !== "all" && keys.has(k));
    const rest = Array.from(keys).filter((k) => !ordered.includes(k)).sort();
    return [...ordered, ...rest];
  }, [cases]);

  return (
    <SiteShell>
      <PromoHeroBanner />

      {featured.length > 0 && (
        <section className="border-t border-cb-stroke/80 bg-black/25 px-3 py-8 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-8 flex items-center gap-3 text-2xl font-bold text-white">
              <span className="h-1 w-10 rounded-full bg-gradient-to-r from-cb-flame to-transparent" />
              Рекомендуемые
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {featured.map((c, i) => (
                <CaseCard
                  key={c.slug}
                  c={c}
                  homeCaseScalePct={100}
                  homeSkinScalePct={100}
                  preloadImages={i < HOME_CARD_IMAGE_PRELOAD}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <section
        id="cases"
        className="scroll-mt-20 border-b border-cb-stroke bg-cb-panel/30 px-3 py-8 sm:scroll-mt-24 sm:px-6 sm:py-12"
      >
        <div className="mx-auto max-w-7xl">
          {error && <p className="mb-6 text-red-400">{error}</p>}
          {sectionKeys.map((key) => {
            const list = cases
              .filter((c) => (c.category || "popular") === key)
              .sort(
                (a, b) =>
                  (a.homeOrder ?? 0) - (b.homeOrder ?? 0) ||
                  a.slug.localeCompare(b.slug),
              );
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
                  {list.map((c, i) => (
                    <CaseCard
                      key={c.slug}
                      c={c}
                      homeCaseScalePct={100}
                      homeSkinScalePct={100}
                      preloadImages={i < HOME_CARD_IMAGE_PRELOAD}
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

      <PartnersLegalFooter />
    </SiteShell>
  );
}
