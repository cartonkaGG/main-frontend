"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatSiteAmount } from "@/lib/money";
import type { AdminCaseFull } from "@/lib/caseConfig";
import Image from "next/image";
import { preferHighResSteamEconomyImage, SKIN_IMG_QUALITY_CLASS } from "@/lib/steamImage";
import { CATEGORY_ORDER } from "@/lib/categories";

function categorySortKey(cat: string): number {
  const c = cat || "popular";
  const i = CATEGORY_ORDER.indexOf(c as (typeof CATEGORY_ORDER)[number]);
  if (i === -1) return 100;
  return i;
}

export default function AdminCasesListPage() {
  const [cases, setCases] = useState<AdminCaseFull[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [moveBusy, setMoveBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await apiFetch<{ cases: AdminCaseFull[] }>("/api/admin/cases");
    if (!r.ok) {
      setErr(r.error || "Не удалось загрузить");
      return;
    }
    setCases(r.data?.cases || []);
    setErr(null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const h = () => load();
    window.addEventListener("cd-cases-updated", h);
    return () => window.removeEventListener("cd-cases-updated", h);
  }, [load]);

  const sortedCases = useMemo(() => {
    return [...cases].sort((a, b) => {
      const ca = categorySortKey(a.category || "popular");
      const cb = categorySortKey(b.category || "popular");
      if (ca !== cb) return ca - cb;
      const ho = (a.homeOrder ?? 0) - (b.homeOrder ?? 0);
      if (ho !== 0) return ho;
      return a.slug.localeCompare(b.slug);
    });
  }, [cases]);

  async function moveHome(slug: string, direction: "up" | "down") {
    setMoveBusy(slug);
    setErr(null);
    try {
      const r = await apiFetch<{ ok?: boolean }>(
        `/api/admin/cases/${encodeURIComponent(slug)}/move-home`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction }),
        },
      );
      if (!r.ok) {
        setErr(r.error || "Не удалось изменить порядок");
        return;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cd-cases-updated"));
      }
      await load();
    } finally {
      setMoveBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Кейсы</h1>
        <Link
          href="/admin/cases/new"
          className="rounded-xl bg-gradient-to-r from-red-700 to-cb-flame px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-900/25 hover:brightness-110"
        >
          + Новый кейс
        </Link>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <p className="text-xs text-zinc-500">
        Кнопки «вверх / вниз» меняют порядок карточек на главной внутри категории (секция на сайте).
      </p>
      <div className="overflow-x-auto rounded-xl border border-cb-stroke bg-cb-panel/30">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-cb-stroke text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-2 py-3">На главной</th>
              <th className="px-4 py-3">Превью</th>
              <th className="px-4 py-3">Название</th>
              <th className="px-4 py-3">Категория</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Цена</th>
              <th className="px-4 py-3">Предметов</th>
              <th className="px-4 py-3">Акцент</th>
              <th className="px-4 py-3">На сайте</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sortedCases.map((c, rowIdx) => {
              const cat = c.category || "popular";
              const prev = rowIdx > 0 ? sortedCases[rowIdx - 1] : null;
              const next = rowIdx < sortedCases.length - 1 ? sortedCases[rowIdx + 1] : null;
              const canUp = prev != null && (prev.category || "popular") === cat;
              const canDown = next != null && (next.category || "popular") === cat;
              return (
              <tr key={c.slug} className="border-b border-cb-stroke/60 last:border-0">
                <td className="px-2 py-2">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      title="Выше в категории на главной"
                      disabled={!canUp || moveBusy === c.slug}
                      onClick={() => void moveHome(c.slug, "up")}
                      className="rounded border border-cb-stroke/80 bg-black/40 px-2 py-1 text-[11px] font-semibold text-zinc-300 transition hover:border-orange-500/50 hover:text-white disabled:opacity-35"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      title="Ниже в категории на главной"
                      disabled={!canDown || moveBusy === c.slug}
                      onClick={() => void moveHome(c.slug, "down")}
                      className="rounded border border-cb-stroke/80 bg-black/40 px-2 py-1 text-[11px] font-semibold text-zinc-300 transition hover:border-orange-500/50 hover:text-white disabled:opacity-35"
                    >
                      ↓
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="relative h-12 w-16 overflow-hidden rounded-lg bg-black/40">
                    {c.image ? (
                      <Image
                        src={preferHighResSteamEconomyImage(c.image, "caseArt") ?? c.image}
                        alt=""
                        fill
                        className={`object-cover ${SKIN_IMG_QUALITY_CLASS}`}
                        sizes="64px"
                        quality={100}
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xs text-zinc-600">
                        —
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 font-medium text-zinc-200">{c.name}</td>
                <td className="px-4 py-2 text-xs text-zinc-400">{cat}</td>
                <td className="px-4 py-2 font-mono text-xs text-zinc-500">{c.slug}</td>
                <td className="px-4 py-2 font-mono text-cb-flame">
                  {formatSiteAmount(c.price)}
                </td>
                <td className="px-4 py-2 text-zinc-400">{c.items?.length ?? 0}</td>
                <td className="px-4 py-2 text-zinc-500">{c.accent}</td>
                <td className="px-4 py-2">
                  {c.hidden ? (
                    <span className="rounded-md border border-zinc-600 bg-zinc-900/80 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                      скрыт
                    </span>
                  ) : (
                    <span className="rounded-md border border-emerald-900/60 bg-emerald-950/40 px-2 py-0.5 text-[11px] font-medium text-emerald-400/90">
                      виден
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/cases/${c.slug}`}
                    className="text-cb-flame hover:underline"
                  >
                    Редактировать
                  </Link>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
        {cases.length === 0 && !err && (
          <p className="p-8 text-center text-zinc-500">Пока нет кейсов. Создайте первый.</p>
        )}
      </div>
    </div>
  );
}
