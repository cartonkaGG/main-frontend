"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ACCENT_KEYS,
  CATEGORY_SUGGESTIONS,
  type AdminCaseFull,
  type LootRow,
  RARITY_OPTIONS,
} from "@/lib/caseConfig";
import { apiFetch, type ApiFieldErrors } from "@/lib/api";

function formatZodDetails(d?: ApiFieldErrors): string | null {
  if (!d) return null;
  const lines: string[] = [];
  const fe = d.fieldErrors || {};
  for (const [key, msgs] of Object.entries(fe)) {
    if (msgs?.length) lines.push(`${key}: ${msgs.join(", ")}`);
  }
  if (d.formErrors?.length) lines.push(...d.formErrors);
  return lines.length ? lines.join("\n") : null;
}

const emptyLoot = (): LootRow => ({
  name: "",
  rarity: "common",
  sellPrice: 0,
  weight: 10,
  image: "",
});

type Props = { mode: "new" | "edit"; initial?: AdminCaseFull | null };

export function CaseEditorForm({ mode, initial }: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState(initial?.slug || "");
  const [name, setName] = useState(initial?.name || "");
  const [price, setPrice] = useState(String(initial?.price ?? 0));
  const [image, setImage] = useState(initial?.image || "");
  const [skinImage, setSkinImage] = useState(initial?.skinImage || "");
  const [heroCaseImageScale, setHeroCaseImageScale] = useState(
    String(initial?.heroCaseImageScale ?? 100),
  );
  const [heroSkinImageScale, setHeroSkinImageScale] = useState(
    String(initial?.heroSkinImageScale ?? 100),
  );
  const [category, setCategory] = useState(initial?.category || "popular");
  const [featured, setFeatured] = useState(Boolean(initial?.featured));
  const [accent, setAccent] = useState(initial?.accent || "amber");
  const [items, setItems] = useState<LootRow[]>(
    initial?.items?.length ? initial.items : [emptyLoot()]
  );
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const payload = useCallback(() => {
    const p = Number(price);
    const rawItems = items.map((it) => ({
      name: it.name.trim(),
      rarity: it.rarity,
      sellPrice: Number(it.sellPrice) || 0,
      weight: Math.max(1, Math.floor(Number(it.weight)) || 1),
      image: (it.image || "").trim(),
    }));
    const hCase = Math.min(180, Math.max(40, Math.round(Number(heroCaseImageScale) || 100)));
    const hSkin = Math.min(180, Math.max(40, Math.round(Number(heroSkinImageScale) || 100)));
    return {
      slug: slug.trim().toLowerCase(),
      name: name.trim(),
      price: Number.isFinite(p) ? p : 0,
      image: image.trim(),
      skinImage: skinImage.trim(),
      heroCaseImageScale: hCase,
      heroSkinImageScale: hSkin,
      category: category.trim() || "popular",
      featured,
      accent: ACCENT_KEYS.includes(accent) ? accent : "amber",
      items: rawItems.filter((it) => it.name.length > 0),
    };
  }, [
    slug,
    name,
    price,
    image,
    skinImage,
    heroCaseImageScale,
    heroSkinImageScale,
    category,
    featured,
    accent,
    items,
  ]);

  async function save() {
    setErr(null);
    setSaving(true);
    const body = payload();
    const namedItems = body.items.filter((it) => it.name.length > 0);
    if (namedItems.length === 0) {
      setSaving(false);
      setErr("Додайте хоча б один предмет у списку з непорожньою назвою.");
      return;
    }
    const saveBody = { ...body, items: namedItems };
    if (mode === "new") {
      const r = await apiFetch<{ case: AdminCaseFull }>("/api/admin/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveBody),
      });
      setSaving(false);
      if (!r.ok) {
        const hint = formatZodDetails(r.details);
        setErr(
          [r.error || "Ошибка сохранения", hint].filter(Boolean).join("\n\n")
        );
        return;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cd-cases-updated"));
      }
      router.push(`/admin/cases/${saveBody.slug}`);
      router.refresh();
      return;
    }
    const r = await apiFetch<{ case: AdminCaseFull }>(`/api/admin/cases/${initial?.slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: saveBody.name,
        price: saveBody.price,
        image: saveBody.image,
        skinImage: saveBody.skinImage,
        heroCaseImageScale: saveBody.heroCaseImageScale,
        heroSkinImageScale: saveBody.heroSkinImageScale,
        category: saveBody.category,
        featured: saveBody.featured,
        accent: saveBody.accent,
        items: saveBody.items,
      }),
    });
    setSaving(false);
    if (!r.ok) {
      const hint = formatZodDetails(r.details);
      setErr(
        [r.error || "Ошибка сохранения", hint].filter(Boolean).join("\n\n")
      );
    }
    else {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cd-cases-updated"));
      }
      router.refresh();
    }
  }

  async function remove() {
    if (mode !== "edit" || !initial?.slug) return;
    if (!confirm(`Удалить кейс «${initial.name}»?`)) return;
    setSaving(true);
    const r = await apiFetch(`/api/admin/cases/${initial.slug}`, { method: "DELETE" });
    setSaving(false);
    if (!r.ok) {
      setErr(r.error || "Не удалось удалить");
      return;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cd-cases-updated"));
    }
    router.push("/admin/cases");
    router.refresh();
  }

  function updateItem(i: number, patch: Partial<LootRow>) {
    setItems((prev) => prev.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">
          {mode === "new" ? "Новый кейс" : `Редактирование: ${initial?.name}`}
        </h1>
        <Link href="/admin/cases" className="text-sm text-cb-flame hover:underline">
          ← К списку
        </Link>
      </div>

      {err && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {err}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Slug (URL)
          </span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={mode === "edit"}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white disabled:opacity-60"
            placeholder="my-case"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Название
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Цена (₽)
          </span>
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Категория
          </span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="cat-suggestions"
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
          />
          <datalist id="cat-suggestions">
            {CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className="block space-y-1 lg:col-span-2">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Коробка кейса — статичное изображение (URL)
          </span>
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
            placeholder="https://… фон открытого кейса"
          />
        </label>
        <label className="block space-y-1 lg:col-span-2">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Скин поверх кейса (URL, лучше PNG с прозрачностью)
          </span>
          <input
            value={skinImage}
            onChange={(e) => setSkinImage(e.target.value)}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
            placeholder="https://… оружие / предмет поверх коробки"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Размер изображения коробки на странице кейса (%)
          </span>
          <input
            type="number"
            min={40}
            max={180}
            value={heroCaseImageScale}
            onChange={(e) => setHeroCaseImageScale(e.target.value)}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
          />
          <span className="text-[10px] text-zinc-500">
            100 — по умолчанию; ниже — меньше коробка, выше — крупнее.
          </span>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Размер PNG скина над кейсом (%)
          </span>
          <input
            type="number"
            min={40}
            max={180}
            value={heroSkinImageScale}
            onChange={(e) => setHeroSkinImageScale(e.target.value)}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
          />
          <span className="text-[10px] text-zinc-500">100 — стандартный масштаб предмета поверх коробки.</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="h-4 w-4 rounded border-cb-stroke"
          />
          <span className="text-sm text-zinc-300">Рекомендуемый (топ)</span>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Цвет рамки карточки
          </span>
          <select
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
          >
            {ACCENT_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Предметы в кейсе</h2>
          <button
            type="button"
            onClick={() => setItems((p) => [...p, emptyLoot()])}
            className="rounded-lg border border-cb-stroke px-3 py-1.5 text-sm text-cb-flame hover:bg-white/5"
          >
            + Строка
          </button>
        </div>
        <div className="space-y-4">
          {items.map((row, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-xl border border-cb-stroke bg-cb-panel/40 p-4 sm:grid-cols-2 lg:grid-cols-6"
            >
              <label className="lg:col-span-2 block space-y-1">
                <span className="text-[10px] uppercase text-zinc-500">Название скина</span>
                <input
                  value={row.name}
                  onChange={(e) => updateItem(i, { name: e.target.value })}
                  className="w-full rounded border border-cb-stroke bg-black/30 px-2 py-1.5 text-sm text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] uppercase text-zinc-500">Редкость</span>
                <select
                  value={row.rarity}
                  onChange={(e) =>
                    updateItem(i, { rarity: e.target.value as LootRow["rarity"] })
                  }
                  className="w-full rounded border border-cb-stroke bg-black/30 px-2 py-1.5 text-sm text-white"
                >
                  {RARITY_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] uppercase text-zinc-500">Цена продажи</span>
                <input
                  type="number"
                  min={0}
                  value={row.sellPrice}
                  onChange={(e) => updateItem(i, { sellPrice: Number(e.target.value) })}
                  className="w-full rounded border border-cb-stroke bg-black/30 px-2 py-1.5 text-sm text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] uppercase text-zinc-500">Вес (шанс)</span>
                <input
                  type="number"
                  min={1}
                  value={row.weight}
                  onChange={(e) => updateItem(i, { weight: Number(e.target.value) })}
                  className="w-full rounded border border-cb-stroke bg-black/30 px-2 py-1.5 text-sm text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] uppercase text-zinc-500">IMG URL</span>
                <div className="flex gap-1">
                  <input
                    value={row.image}
                    onChange={(e) => updateItem(i, { image: e.target.value })}
                    className="min-w-0 flex-1 rounded border border-cb-stroke bg-black/30 px-2 py-1.5 text-sm text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setItems((p) => p.filter((_, j) => j !== i))}
                    className="shrink-0 rounded border border-red-900/50 px-2 text-xs text-red-400 hover:bg-red-950/40"
                  >
                    ✕
                  </button>
                </div>
              </label>
            </div>
          ))}
        </div>
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
            Удалить кейс
          </button>
        )}
      </div>
    </div>
  );
}
