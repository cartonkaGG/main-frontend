"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ACCENT_KEYS,
  CATEGORY_SUGGESTIONS,
  type AdminCaseFull,
  type LootRow,
  RARITY_OPTIONS,
} from "@/lib/caseConfig";
import { apiFetch, type ApiFieldErrors } from "@/lib/api";
import { formatSiteAmount } from "@/lib/money";
import { MarketCsgoHashInput } from "@/components/admin/MarketCsgoHashInput";
import { ImgbbUploadButton } from "@/components/admin/ImgbbUploadButton";

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
  dmarketTitle: "",
});

type Props = { mode: "new" | "edit"; initial?: AdminCaseFull | null };

export function CaseEditorForm({ mode, initial }: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState(initial?.slug || "");
  const [name, setName] = useState(initial?.name || "");
  const [price, setPrice] = useState(String(initial?.price ?? 0));
  const [image, setImage] = useState(initial?.image || "");
  const [skinImage, setSkinImage] = useState(initial?.skinImage || "");
  const [cardCaseImageScale, setCardCaseImageScale] = useState(
    String(initial?.cardCaseImageScale ?? initial?.heroCaseImageScale ?? 100),
  );
  const [cardSkinImageScale, setCardSkinImageScale] = useState(
    String(initial?.cardSkinImageScale ?? initial?.heroSkinImageScale ?? 100),
  );
  const [heroCaseImageScale, setHeroCaseImageScale] = useState(
    String(initial?.heroCaseImageScale ?? 100),
  );
  const [heroSkinImageScale, setHeroSkinImageScale] = useState(
    String(initial?.heroSkinImageScale ?? 100),
  );
  const [category, setCategory] = useState(initial?.category || "popular");
  const [featured, setFeatured] = useState(Boolean(initial?.featured));
  const [hidden, setHidden] = useState(Boolean(initial?.hidden));
  const [accent, setAccent] = useState(initial?.accent || "amber");
  const [homeOrder, setHomeOrder] = useState<number>(() =>
    Math.max(0, Math.floor(Number(initial?.homeOrder) || 0)),
  );
  const [items, setItems] = useState<LootRow[]>(
    initial?.items?.length ? initial.items : [emptyLoot()]
  );
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** Індекс рядка → ціна market.csgo (орієнтир, у SC) або null */
  const [rowMarketRub, setRowMarketRub] = useState<Record<number, number | null>>({});
  const [rowQuoteLoading, setRowQuoteLoading] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    const t = window.setTimeout(() => {
      void (async () => {
        setRowQuoteLoading(true);
        const next: Record<number, number | null> = {};
        for (let i = 0; i < items.length; i++) {
          if (ac.signal.aborted) return;
          const q = (items[i].dmarketTitle || items[i].name || "").trim();
          if (!q) {
            next[i] = null;
            continue;
          }
          const r = await apiFetch<{ quote: { priceRub: number } | null }>(
            `/api/admin/market-quote?title=${encodeURIComponent(q)}`,
            { signal: ac.signal },
          );
          if (ac.signal.aborted) return;
          next[i] =
            r.ok && r.data?.quote != null && typeof r.data.quote.priceRub === "number"
              ? r.data.quote.priceRub
              : null;
        }
        if (!ac.signal.aborted) {
          setRowMarketRub(next);
          setRowQuoteLoading(false);
        }
      })();
    }, 450);
    return () => {
      ac.abort();
      window.clearTimeout(t);
    };
  }, [items]);

  useEffect(() => {
    if (mode !== "edit" || initial?.homeOrder == null) return;
    const h = Math.floor(Number(initial.homeOrder));
    if (Number.isFinite(h) && h >= 0) setHomeOrder(h);
  }, [mode, initial?.slug, initial?.homeOrder]);

  const payload = useCallback(() => {
    const p = Number(price);
    const rawItems = items.map((it) => ({
      name: it.name.trim(),
      rarity: it.rarity,
      sellPrice: Number(it.sellPrice) || 0,
      weight: Math.max(1, Math.floor(Number(it.weight)) || 1),
      image: (it.image || "").trim(),
      dmarketTitle: (it.dmarketTitle || "").trim().slice(0, 300),
    }));
    const cCase = Math.min(180, Math.max(40, Math.round(Number(cardCaseImageScale) || 100)));
    const cSkin = Math.min(180, Math.max(40, Math.round(Number(cardSkinImageScale) || 100)));
    const hCase = Math.min(180, Math.max(40, Math.round(Number(heroCaseImageScale) || 100)));
    const hSkin = Math.min(180, Math.max(40, Math.round(Number(heroSkinImageScale) || 100)));
    const base = {
      slug: slug.trim().toLowerCase(),
      name: name.trim(),
      price: Number.isFinite(p) ? p : 0,
      image: image.trim(),
      skinImage: skinImage.trim(),
      cardCaseImageScale: cCase,
      cardSkinImageScale: cSkin,
      heroCaseImageScale: hCase,
      heroSkinImageScale: hSkin,
      category: category.trim() || "popular",
      featured,
      hidden,
      accent: ACCENT_KEYS.includes(accent) ? accent : "amber",
      items: rawItems.filter((it) => it.name.length > 0),
    };
    if (mode === "edit") {
      return {
        ...base,
        homeOrder: Math.max(0, Math.min(1_000_000, Math.floor(Number(homeOrder) || 0))),
      };
    }
    return base;
  }, [
    mode,
    slug,
    name,
    price,
    image,
    skinImage,
    cardCaseImageScale,
    cardSkinImageScale,
    heroCaseImageScale,
    heroSkinImageScale,
    category,
    featured,
    hidden,
    accent,
    homeOrder,
    items,
  ]);

  async function save() {
    setErr(null);
    setSaving(true);
    const body = payload();
    const namedItems = body.items.filter((it) => it.name.length > 0);
    if (namedItems.length === 0) {
      setSaving(false);
      setErr("Добавьте хотя бы один предмет в списке с непустым названием.");
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
        cardCaseImageScale: saveBody.cardCaseImageScale,
        cardSkinImageScale: saveBody.cardSkinImageScale,
        heroCaseImageScale: saveBody.heroCaseImageScale,
        heroSkinImageScale: saveBody.heroSkinImageScale,
        category: saveBody.category,
        homeOrder,
        featured: saveBody.featured,
        hidden: saveBody.hidden,
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
            Цена (SC)
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
              placeholder="https://… фон открытого кейса"
            />
            <ImgbbUploadButton
              nameHint={`case-${slug.trim() || "new"}-box`}
              onUploaded={(url) => setImage(url)}
            />
          </div>
          <p className="text-[10px] leading-snug text-zinc-600">
            Прямая ссылка или загрузка на{" "}
            <a
              href="https://uk.imgbb.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400/95 hover:underline"
            >
              ImgBB
            </a>{" "}
            через кнопку (на сервере нужен{" "}
            <span className="font-mono text-zinc-500">IMGBB_API_KEY</span>
            ). Перед загрузкой картинка ужимается до ~1280 px — так быстрее грузится на сайте.
          </p>
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
        <div className="space-y-2 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Главная — карточка в каталоге
          </p>
          <p className="text-[10px] text-zinc-500">
            Умножается с глобальным % в разделе «Главная (карточки)». Отдельно от страницы кейса.
          </p>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Коробка на главной (%)
          </span>
          <input
            type="number"
            min={40}
            max={180}
            value={cardCaseImageScale}
            onChange={(e) => setCardCaseImageScale(e.target.value)}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Скин на главной (%)
          </span>
          <input
            type="number"
            min={40}
            max={180}
            value={cardSkinImageScale}
            onChange={(e) => setCardSkinImageScale(e.target.value)}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <div className="space-y-2 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Страница открытия кейса (меню кейса)
          </p>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Коробка на странице кейса (%)
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
            100 — по умолчанию; только блок с кольцом на /cases/…
          </span>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Скин на странице кейса (%)
          </span>
          <input
            type="number"
            min={40}
            max={180}
            value={heroSkinImageScale}
            onChange={(e) => setHeroSkinImageScale(e.target.value)}
            className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
          />
          <span className="text-[10px] text-zinc-500">Только hero на странице кейса.</span>
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
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hidden}
            onChange={(e) => setHidden(e.target.checked)}
            className="h-4 w-4 rounded border-cb-stroke"
          />
          <span className="text-sm text-zinc-300">
            Скрыть с сайта (нет в каталоге, открыть нельзя)
          </span>
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
              <label className="block space-y-1 sm:col-span-2 lg:col-span-6">
                <span className="text-[10px] uppercase text-zinc-500">
                  Market.csgo hash (опц., поиск по прайсу)
                </span>
                <MarketCsgoHashInput
                  value={row.dmarketTitle || ""}
                  onChange={(v) => updateItem(i, { dmarketTitle: v })}
                  inputClassName="w-full rounded border border-cb-stroke bg-black/30 px-2 py-1.5 font-mono text-xs text-white placeholder:text-zinc-600"
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
              <div className="flex items-center justify-between gap-2 sm:col-span-2 lg:col-span-6 border-t border-cb-stroke/50 pt-3">
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  Ринок (market.csgo)
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums text-emerald-300/95">
                  {(() => {
                    const q = (row.dmarketTitle || row.name || "").trim();
                    if (!q) return "—";
                    const rub = rowMarketRub[i];
                    if (rowQuoteLoading && rub === undefined) return "…";
                    return rub != null ? formatSiteAmount(rub) : "—";
                  })()}
                </span>
              </div>
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
