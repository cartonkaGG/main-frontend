"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CaseCard, type CaseSummary } from "@/components/CaseCard";
import { SiteShell } from "@/components/SiteShell";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import { apiFetch } from "@/lib/api";

export default function CasesPage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState<string>("all");

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

  const filtered = useMemo(() => {
    if (cat === "all") return cases;
    return cases.filter((c) => c.category === cat);
  }, [cases, cat]);

  const sectionKeys = useMemo(() => {
    if (cat !== "all") return [];
    const keys = new Set(filtered.map((c) => c.category || "popular"));
    const ordered: string[] = CATEGORY_ORDER.filter((k) => k !== "all" && keys.has(k));
    const rest = Array.from(keys).filter((k) => !ordered.includes(k)).sort();
    return [...ordered, ...rest];
  }, [cat, filtered]);

  return (
    <SiteShell>
      <section className="border-b border-cb-stroke bg-cb-panel/30 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Кейсы</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Фильтр по категориям. Открытие на странице кейса; нужен вход через Steam.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {CATEGORY_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCat(key)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  cat === key
                    ? "border-cb-flame/60 bg-red-950/40 text-cb-flame"
                    : "border-cb-stroke bg-cb-panel/50 text-zinc-400 hover:border-red-900/50 hover:text-zinc-200"
                }`}
              >
                {CATEGORY_LABELS[key] || key}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          {error && <p className="mb-6 text-red-400">{error}</p>}
          {cat === "all" ? (
            sectionKeys.map((key) => {
              const list = filtered.filter((c) => (c.category || "popular") === key);
              if (!list.length) return null;
              return (
                <div key={key} className="mb-14">
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
            })
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((c) => (
                <CaseCard key={c.slug} c={c} />
              ))}
            </div>
          )}
          {!error && filtered.length === 0 && (
            <p className="text-zinc-500">В этой категории пока нет кейсов.</p>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
