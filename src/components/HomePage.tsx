"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CaseCard, type CaseSummary } from "@/components/CaseCard";
import { PromoHeroBanner } from "@/components/PromoHeroBanner";
import { SiteShell } from "@/components/SiteShell";
import { apiFetch } from "@/lib/api";

export function HomePage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);

  const loadCases = useCallback(async () => {
    const r = await apiFetch<{ cases: CaseSummary[] }>("/api/cases");
    if (r.ok && r.data?.cases) setCases(r.data.cases);
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

      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl text-center">
          <Link
            href="/cases"
            className="text-sm font-semibold text-cb-flame hover:underline"
          >
            Все категории и кейсы →
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
