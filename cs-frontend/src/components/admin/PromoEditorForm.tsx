"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import type { AdminPromo } from "@/lib/promoAdmin";
import { apiFetch } from "@/lib/api";
import { formatSiteAmount } from "@/lib/money";

type Props = { mode: "new" | "edit"; initial?: AdminPromo | null };

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PromoEditorForm({ mode, initial }: Props) {
  const router = useRouter();
  const [code, setCode] = useState(initial?.code || "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [rewardType, setRewardType] = useState<"balance" | "depositPct">(
    initial?.rewardType ?? "balance",
  );
  const [bonusPercent, setBonusPercent] = useState(String(initial?.bonusPercent ?? 17));
  const [percentBaseRub, setPercentBaseRub] = useState(String(initial?.percentBaseRub ?? 1000));
  const [extraFlatRub, setExtraFlatRub] = useState(String(initial?.extraFlatRub ?? 0));
  const [expiresLocal, setExpiresLocal] = useState(toLocalInput(initial?.expiresAt ?? null));
  const [maxUsesGlobal, setMaxUsesGlobal] = useState(
    initial?.maxUsesGlobal != null ? String(initial.maxUsesGlobal) : ""
  );
  const [maxUsesPerUser, setMaxUsesPerUser] = useState(String(initial?.maxUsesPerUser ?? 1));
  const [bannerSubline, setBannerSubline] = useState(initial?.bannerSubline || "НА СЧЁТ");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function body() {
    const expiresAt =
      expiresLocal.trim() === "" ? "" : new Date(expiresLocal).toISOString();
    const mg = maxUsesGlobal.trim();
    return {
      code: code.trim(),
      active,
      featured,
      rewardType,
      bonusPercent: Number(bonusPercent) || 0,
      percentBaseRub: rewardType === "balance" ? Number(percentBaseRub) || 0 : 0,
      extraFlatRub: rewardType === "balance" ? Number(extraFlatRub) || 0 : 0,
      expiresAt,
      maxUsesGlobal: mg === "" ? null : Number(mg),
      maxUsesPerUser: Math.max(1, Number(maxUsesPerUser) || 1),
      bannerSubline: bannerSubline.trim() || "НА СЧЁТ",
    };
  }

  async function save() {
    setErr(null);
    setSaving(true);
    const payload = body();
    if (mode === "new") {
      const r = await apiFetch<{ promo: AdminPromo }>("/api/admin/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSaving(false);
      if (!r.ok) {
        setErr(r.error || "Ошибка сохранения");
        return;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cd-promos-updated"));
      }
      router.push("/admin/promos");
      router.refresh();
      return;
    }
    const r = await apiFetch<{ promo: AdminPromo }>(`/api/admin/promos/${initial?.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!r.ok) setErr(r.error || "Ошибка сохранения");
    else {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cd-promos-updated"));
      }
      router.refresh();
    }
  }

  async function remove() {
    if (mode !== "edit" || !initial?.id) return;
    if (!confirm(`Удалить промокод «${initial.code}»?`)) return;
    setSaving(true);
    const r = await apiFetch(`/api/admin/promos/${initial.id}`, { method: "DELETE" });
    setSaving(false);
    if (!r.ok) {
      setErr(r.error || "Не удалось удалить");
      return;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cd-promos-updated"));
    }
    router.push("/admin/promos");
    router.refresh();
  }

  const previewBalance =
    (Number(extraFlatRub) || 0) +
    Math.floor(((Number(percentBaseRub) || 0) * (Number(bonusPercent) || 0)) / 100);
  const depositPct = Number(bonusPercent) || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">
          {mode === "new" ? "Новый промокод" : `Редактирование: ${initial?.code}`}
        </h1>
        <Link href="/admin/promos" className="text-sm text-cb-flame hover:underline">
          ← К списку
        </Link>
      </div>

      {err && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {err}
        </div>
      )}

      <p className="text-sm text-zinc-500">
        {rewardType === "balance" ? (
          <>
            Начисление: фикс{" "}
            <span className="font-mono text-zinc-400">{formatSiteAmount(Number(extraFlatRub) || 0)}</span> +{" "}
            <span className="font-mono text-zinc-400">{bonusPercent || 0}%</span> от базы{" "}
            <span className="font-mono text-zinc-400">{formatSiteAmount(Number(percentBaseRub) || 0)}</span> → итого ≈{" "}
            <span className="font-mono text-cb-flame">{formatSiteAmount(previewBalance)}</span>
          </>
        ) : (
          <>
            Бонус: <span className="font-mono text-cb-flame">{depositPct}%</span> к депозиту
          </>
        )}
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Тип промокода
          </span>
          <select
            value={rewardType}
            onChange={(e) => setRewardType(e.target.value as "balance" | "depositPct")}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
          >
            <option value="balance">Деньги на баланс</option>
            <option value="depositPct">Процент к депозиту</option>
          </select>
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Код</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 font-mono text-white"
            placeholder="ROSE-17"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-cb-stroke"
          />
          <span className="text-sm text-zinc-300">Активен</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="h-4 w-4 rounded border-cb-stroke"
          />
          <span className="text-sm text-amber-400/90">Главный на баннере</span>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {rewardType === "balance"
              ? "Процент (для баннера + начисления)"
              : "Процент (к депозиту)"}
          </span>
          <input
            type="number"
            min={0}
            max={500}
            value={bonusPercent}
            onChange={(e) => setBonusPercent(e.target.value)}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
          />
        </label>
        {rewardType === "balance" ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                База для процента (SC)
              </span>
              <input
                type="number"
                min={0}
                value={percentBaseRub}
                onChange={(e) => setPercentBaseRub(e.target.value)}
                className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Доп. фикс (SC)
              </span>
              <input
                type="number"
                min={0}
                value={extraFlatRub}
                onChange={(e) => setExtraFlatRub(e.target.value)}
                className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
              />
            </label>
          </>
        ) : (
          <>
            <div className="text-xs text-zinc-500 sm:col-span-1">
              База и фикс не используются для типа «Процент к депозиту».
            </div>
          </>
        )}
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Окончание (локальное время)
          </span>
          <input
            type="datetime-local"
            value={expiresLocal}
            onChange={(e) => setExpiresLocal(e.target.value)}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Лимит активаций (всего), пусто = ∞
          </span>
          <input
            value={maxUsesGlobal}
            onChange={(e) => setMaxUsesGlobal(e.target.value)}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
            placeholder="∞"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            На одного пользователя
          </span>
          <input
            type="number"
            min={1}
            value={maxUsesPerUser}
            onChange={(e) => setMaxUsesPerUser(e.target.value)}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Подпись под процентом (баннер)
          </span>
          <input
            value={bannerSubline}
            onChange={(e) => setBannerSubline(e.target.value)}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-xl bg-gradient-to-r from-red-700 to-cb-flame px-8 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/30 disabled:opacity-50"
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
        {mode === "edit" && (
          <button
            type="button"
            disabled={saving}
            onClick={remove}
            className="rounded-xl border border-red-500/50 px-6 py-3 text-sm text-red-400 hover:bg-red-950/30 disabled:opacity-50"
          >
            Удалить
          </button>
        )}
      </div>
    </div>
  );
}
