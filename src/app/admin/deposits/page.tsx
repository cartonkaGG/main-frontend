"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Entry = {
  id: string;
  kind: "crypto" | "promo" | "admin";
  at: string;
  status: string;
  userSub: string;
  userSteamId?: string | null;
  userDisplayName?: string | null;
  amountUsd?: number;
  creditRubBase?: number;
  bonusRub?: number;
  totalRub?: number | null;
  depositPercent?: number;
  orderId?: string;
  paymentId?: string | null;
  amountRub?: number;
  promoCode?: string | null;
  promoId?: string;
  balanceAfter?: number | null;
  adminDisplayName?: string;
  detail?: string;
};

const kindLabel: Record<string, string> = {
  crypto: "Крипта (NOWPayments)",
  promo: "Промокод на баланс",
  admin: "Админ начислил",
};

export default function AdminDepositsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const r = await apiFetch<{ entries: Entry[]; total: number }>("/api/admin/deposits?limit=800");
    setLoading(false);
    if (!r.ok) {
      setErr(r.error || "Не вдалося завантажити");
      setEntries([]);
      setTotal(0);
      return;
    }
    setEntries(Array.isArray(r.data?.entries) ? r.data!.entries : []);
    setTotal(typeof r.data?.total === "number" ? r.data!.total : 0);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Історія поповнень балансу</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Крипто-платежі (у т.ч. очікують оплати), активації промокодів на баланс і ручні нарахування адміна
            (add). Відсортовано за часом, нові зверху.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-xl border border-cb-stroke bg-black/40 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-amber-500/50 hover:text-white disabled:opacity-50"
        >
          {loading ? "…" : "Оновити"}
        </button>
      </div>

      {err ? (
        <p className="rounded-xl border border-red-500/35 bg-red-950/20 px-4 py-3 text-sm text-red-300">{err}</p>
      ) : null}

      <p className="text-xs text-zinc-600">
        Показано <span className="font-mono text-zinc-400">{entries.length}</span> з{" "}
        <span className="font-mono text-zinc-400">{total}</span> записів
      </p>

      <div className="overflow-x-auto rounded-2xl border border-cb-stroke bg-cb-panel/40">
        <table className="w-full min-w-[960px] text-left text-[12px]">
          <thead className="border-b border-cb-stroke bg-black/50 text-[10px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-3 py-2.5">Час</th>
              <th className="px-3 py-2.5">Тип</th>
              <th className="px-3 py-2.5">Користувач</th>
              <th className="px-3 py-2.5">Сума ₽</th>
              <th className="px-3 py-2.5">Деталі</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-zinc-600">
                  Поки немає записів поповнень.
                </td>
              </tr>
            ) : null}
            {entries.map((e) => {
              const steam = e.userSteamId || (e.kind !== "crypto" ? e.userSub : null);
              const name = e.userDisplayName || e.userSub || "—";
              const rub =
                e.kind === "crypto"
                  ? e.status === "credited"
                    ? e.totalRub
                    : null
                  : e.totalRub;
              const rubLine =
                e.kind === "crypto"
                  ? e.status === "pending"
                    ? `очікує (база ${e.creditRubBase ?? "—"} ₽)`
                    : `${rub ?? "—"} ₽`
                  : `${rub ?? "—"} ₽`;

              let detail = "";
              if (e.kind === "crypto") {
                detail = `${e.amountUsd ?? "—"} USD · order ${e.orderId || "—"}`;
                if (e.paymentId) detail += ` · payment ${e.paymentId}`;
                if (e.status === "credited" && (e.bonusRub ?? 0) > 0) {
                  detail += ` · бонус ${e.depositPercent}% (+${e.bonusRub} ₽)`;
                }
              } else if (e.kind === "promo") {
                detail = e.promoCode ? `код ${e.promoCode}` : e.promoId || "промо";
              } else {
                detail = `від ${e.adminDisplayName || "адміна"}${e.balanceAfter != null ? ` · баланс після: ${e.balanceAfter}` : ""}`;
              }

              return (
                <tr key={e.id} className="border-b border-cb-stroke/60 hover:bg-black/20">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-zinc-400">
                    {e.at ? new Date(e.at).toLocaleString("uk-UA") : "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">{kindLabel[e.kind] || e.kind}</td>
                  <td className="px-3 py-2">
                    <div className="text-zinc-200">{name}</div>
                    {steam && /^\d{17}$/.test(steam) ? (
                      <Link
                        href={`/admin/users?q=${encodeURIComponent(steam)}`}
                        className="font-mono text-[10px] text-cb-flame/90 hover:underline"
                      >
                        {steam}
                      </Link>
                    ) : (
                      <span className="font-mono text-[10px] text-zinc-600" title={e.userSub}>
                        {steam || e.userSub || "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-200">{rubLine}</td>
                  <td className="max-w-md px-3 py-2 text-zinc-500">{detail}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
