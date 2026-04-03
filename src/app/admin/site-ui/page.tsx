"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type SiteUi = {
  homeCaseImageScale: number;
  homeSkinImageScale: number;
  rubPerUsd: number;
};

export default function AdminSiteUiPage() {
  const [homeCase, setHomeCase] = useState("100");
  const [homeSkin, setHomeSkin] = useState("100");
  const [rubPerUsd, setRubPerUsd] = useState("95");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch<SiteUi>("/api/admin/site-ui");
    setLoading(false);
    if (!r.ok) {
      setErr(
        r.status === 404
          ? "Маршрут API не найден. Перезапустите backend из текущего кода (нужны GET/PUT /api/admin/site-ui)."
          : r.error || "Не удалось загрузить",
      );
      return;
    }
    const d = r.data!;
    setHomeCase(String(d.homeCaseImageScale));
    setHomeSkin(String(d.homeSkinImageScale));
    setRubPerUsd(String(d.rubPerUsd ?? 95));
    setErr(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setErr(null);
    setSaving(true);
    const homeCaseImageScale = Math.min(
      180,
      Math.max(40, Math.round(Number(homeCase) || 100)),
    );
    const homeSkinImageScale = Math.min(
      180,
      Math.max(40, Math.round(Number(homeSkin) || 100)),
    );
    const rub = Math.min(500, Math.max(1, Math.round(Number(rubPerUsd) || 95)));
    const r = await apiFetch<SiteUi>("/api/admin/site-ui", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeCaseImageScale, homeSkinImageScale, rubPerUsd: rub }),
    });
    setSaving(false);
    if (!r.ok) {
      setErr(r.error || "Ошибка сохранения");
      return;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cd-site-ui-updated"));
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Интерфейс и пополнение</h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-400">
          Масштабы карточек на главной и курс USD→SC (зачисление на баланс) для крипто-пополнения (NOWPayments). Курс
          хранится в{" "}
          <span className="font-mono text-zinc-300">siteUi.json</span>; значение из{" "}
          <span className="font-mono text-zinc-300">NOWPAYMENTS_RUB_PER_USD</span> в .env подставляется только
          если в файле курс ещё не задан.
        </p>
      </div>

      {err && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {err}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Загрузка…</p>
      ) : (
        <div className="grid max-w-md gap-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Крипто-пополнение</h2>
            <label className="mt-3 block space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                SC за 1 USD (зачисление на баланс)
              </span>
              <input
                type="number"
                min={1}
                max={500}
                value={rubPerUsd}
                onChange={(e) => setRubPerUsd(e.target.value)}
                className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
              />
            </label>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">Картки на главной</h2>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Масштаб изображения коробки на главной (%)
            </span>
            <input
              type="number"
              min={40}
              max={180}
              value={homeCase}
              onChange={(e) => setHomeCase(e.target.value)}
              className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Масштаб PNG скина на главной (%)
            </span>
            <input
              type="number"
              min={40}
              max={180}
              value={homeSkin}
              onChange={(e) => setHomeSkin(e.target.value)}
              className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-xl bg-gradient-to-r from-red-700 to-cb-flame px-8 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/30 disabled:opacity-50"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      )}
    </div>
  );
}
