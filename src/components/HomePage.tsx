"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CaseCard, type CaseSummary } from "@/components/CaseCard";
import { PromoHeroBanner } from "@/components/PromoHeroBanner";
import { SiteShell } from "@/components/SiteShell";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import { apiFetch } from "@/lib/api";

export function HomePage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
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
    loadCases();
  }, [loadCases]);

  useEffect(() => {
    const h = () => loadCases();
    window.addEventListener("cd-cases-updated", h);
    return () => window.removeEventListener("cd-cases-updated", h);
  }, [loadCases]);

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

      {featured.length > 0 && (
        <section className="border-t border-cb-stroke/80 bg-black/25 px-6 py-14">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-8 flex items-center gap-3 text-2xl font-bold text-white">
              <span className="h-1 w-10 rounded-full bg-gradient-to-r from-cb-flame to-transparent" />
              Рекомендуемые
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((c) => (
                <CaseCard key={c.slug} c={c} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section
        id="cases"
        className="scroll-mt-24 border-b border-cb-stroke bg-cb-panel/30 px-6 py-12"
      >
        <div className="mx-auto max-w-6xl">
          {error && <p className="mb-6 text-red-400">{error}</p>}
          {sectionKeys.map((key) => {
            const list = cases.filter((c) => (c.category || "popular") === key);
            if (!list.length) return null;
            return (
              <div key={key} className="mb-14 last:mb-0">
                <h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-white">
                  <span className="h-px max-w-12 flex-1 bg-gradient-to-r from-cb-flame to-transparent" />
                  {CATEGORY_LABELS[key] || key}
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {list.map((c) => (
                    <CaseCard key={c.slug} c={c} />
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
