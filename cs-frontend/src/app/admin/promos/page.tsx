"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AdminPromo } from "@/lib/promoAdmin";

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<AdminPromo[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await apiFetch<{ promos: AdminPromo[] }>("/api/admin/promos");
    if (!r.ok) {
      setErr(r.error || "Не удалось загрузить");
      return;
    }
    setPromos(r.data?.promos || []);
    setErr(null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const h = () => load();
    window.addEventListener("cd-promos-updated", h);
    return () => window.removeEventListener("cd-promos-updated", h);
  }, [load]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Промокоды</h1>
        <Link
          href="/admin/promos/new"
          className="rounded-xl bg-gradient-to-r from-red-700 to-cb-flame px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-900/25 hover:brightness-110"
        >
          + Новый промокод
        </Link>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <div className="overflow-x-auto rounded-xl border border-cb-stroke bg-cb-panel/30">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-cb-stroke text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-4 py-3">Код</th>
              <th className="px-4 py-3">Тип</th>
              <th className="px-4 py-3">Бонус (SC)</th>
              <th className="px-4 py-3">%</th>
              <th className="px-4 py-3">Активен</th>
              <th className="px-4 py-3">Баннер</th>
              <th className="px-4 py-3">Использовано</th>
              <th className="px-4 py-3">До</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {promos.map((p) => (
              <tr key={p.id} className="border-b border-cb-stroke/60 last:border-0">
                <td className="px-4 py-2 font-mono font-medium text-cb-flame">{p.code}</td>
                <td className="px-4 py-2 text-zinc-300">
                  {p.rewardType === "balance" ? "Баланс" : "Депозит %"}
                </td>
                <td className="px-4 py-2 font-mono text-zinc-300">
                  {p.rewardType === "balance" ? p.computedGrant ?? "—" : "—"}
                </td>
                <td className="px-4 py-2 text-zinc-400">{p.bonusPercent}</td>
                <td className="px-4 py-2 text-zinc-400">{p.active ? "да" : "нет"}</td>
                <td className="px-4 py-2 text-amber-400/80">{p.featured ? "да" : "—"}</td>
                <td className="px-4 py-2 text-zinc-400">
                  {p.usedCount}
                  {p.maxUsesGlobal != null ? ` / ${p.maxUsesGlobal}` : ""}
                </td>
                <td className="px-4 py-2 text-xs text-zinc-500">
                  {p.expiresAt
                    ? new Date(p.expiresAt).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/promos/${p.id}`} className="text-cb-flame hover:underline">
                    Изменить
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {promos.length === 0 && !err && (
          <p className="p-8 text-center text-zinc-500">Промокодов пока нет.</p>
        )}
      </div>
    </div>
  );
}
