"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  DEFAULT_CAROUSEL_SLIDE_FIELDS,
  DEFAULT_HOME_PROMO_HERO,
  mergeHomePromoHero,
  type HomePromoHeroButton,
  type HomePromoHeroCarouselSlide,
  type HomePromoHeroConfig,
} from "@/lib/siteUi";

type SiteUi = {
  homeCaseImageScale: number;
  homeSkinImageScale: number;
  rubPerUsd: number;
  homePromoHero: HomePromoHeroConfig;
};

export default function AdminSiteUiPage() {
  const [homeCase, setHomeCase] = useState("100");
  const [homeSkin, setHomeSkin] = useState("100");
  const [rubPerUsd, setRubPerUsd] = useState("95");
  const [hero, setHero] = useState<HomePromoHeroConfig>(() => ({ ...DEFAULT_HOME_PROMO_HERO }));
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
    setHero(mergeHomePromoHero(d.homePromoHero));
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
    /** Явні поля, щоб JSON не втрачав boolean (carousel) через undefined у об’єкті. */
    const homePromoHeroPayload: HomePromoHeroConfig = {
      ...hero,
      carouselEnabled: hero.carouselEnabled === true,
      carouselSlides: Array.isArray(hero.carouselSlides) ? hero.carouselSlides : [],
      carouselImageScalePct:
        typeof hero.carouselImageScalePct === "number" && Number.isFinite(hero.carouselImageScalePct)
          ? hero.carouselImageScalePct
          : DEFAULT_HOME_PROMO_HERO.carouselImageScalePct,
    };
    const r = await apiFetch<SiteUi>("/api/admin/site-ui", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeCaseImageScale,
        homeSkinImageScale,
        rubPerUsd: rub,
        homePromoHero: homePromoHeroPayload,
      }),
    });
    setSaving(false);
    if (!r.ok) {
      setErr(r.error || "Ошибка сохранения");
      return;
    }
    if (r.data) {
      setHomeCase(String(r.data.homeCaseImageScale));
      setHomeSkin(String(r.data.homeSkinImageScale));
      setRubPerUsd(String(r.data.rubPerUsd ?? 95));
      if (r.data.homePromoHero != null) {
        setHero(mergeHomePromoHero(r.data.homePromoHero));
      }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cd-site-ui-updated"));
    }
  }

  function setButton(i: number, patch: Partial<HomePromoHeroButton>) {
    setHero((h) => {
      const buttons = [...h.buttons];
      const cur = buttons[i] ?? { label: "", href: "" };
      buttons[i] = { ...cur, ...patch };
      return { ...h, buttons };
    });
  }

  function addButton() {
    setHero((h) => ({
      ...h,
      buttons: [...h.buttons, { label: "Перейти", href: "/cases" }],
    }));
  }

  function removeButton(i: number) {
    setHero((h) => ({
      ...h,
      buttons: h.buttons.filter((_, j) => j !== i),
    }));
  }

  function setCarouselSlide(i: number, patch: Partial<HomePromoHeroCarouselSlide>) {
    setHero((h) => {
      const carouselSlides = [...h.carouselSlides];
      const raw = carouselSlides[i];
      const cur: HomePromoHeroCarouselSlide = {
        ...DEFAULT_CAROUSEL_SLIDE_FIELDS,
        ...raw,
        imageUrl: raw?.imageUrl ?? "",
        alt: raw?.alt ?? "",
        href: raw?.href ?? "",
      };
      carouselSlides[i] = { ...cur, ...patch };
      return { ...h, carouselSlides };
    });
  }

  function addCarouselSlide() {
    setHero((h) => ({
      ...h,
      carouselSlides: [
        ...h.carouselSlides,
        {
          ...DEFAULT_CAROUSEL_SLIDE_FIELDS,
          imageUrl: "https://i.ibb.co/yb3zxnq/case-rat-box-Gemini-Generated-Image-l59b0rl59b0rl59b.png",
          alt: "",
          href: "",
        },
      ],
    }));
  }

  function removeCarouselSlide(i: number) {
    setHero((h) => ({
      ...h,
      carouselSlides: h.carouselSlides.filter((_, j) => j !== i),
    }));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Интерфейс и пополнение</h1>
        <div className="mt-4 max-w-2xl rounded-xl border border-sky-500/35 bg-sky-950/25 px-4 py-3 text-sm text-sky-100/95">
          <p className="font-semibold text-sky-200">Эта страница — пункт меню «Главная: банер и карточки».</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sky-100/85">
            <li>
              <strong>Банер слева</strong> (заголовок, подзаголовок, фон, кнопки-ссылки) — блок ниже, секция «Банер на
              главной».
            </li>
            <li>
              <strong>Карусель PNG на банере</strong> — в секции банера, чекбокс и слайды.
            </li>
            <li>
              <strong>Масштаб карточек кейсов</strong> — внизу страницы.
            </li>
            <li>
              <strong>Курс крипто-пополнения</strong> (SC за 1 USD) — раздел «Крипто-пополнение».
            </li>
          </ul>
        </div>
        <p className="mt-4 max-w-xl text-sm text-zinc-400">
          Настройки хранятся в <span className="font-mono text-zinc-300">siteUi.json</span>; значение из{" "}
          <span className="font-mono text-zinc-300">NOWPAYMENTS_RUB_PER_USD</span> в .env подставляется только если в
          файле курс ещё не задан.
        </p>
      </div>

      {err && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">{err}</div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Загрузка…</p>
      ) : (
        <div className="grid max-w-2xl gap-10">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Банер на главной (слева, с таймером)</h2>
            <p className="text-sm text-zinc-500">
              Заголовок и подзаголовок, фон (градиент или картинка по URL), до 8 кнопок. Ссылки: внутренние пути вида{" "}
              <span className="font-mono text-zinc-400">/cases</span> или полные https. PNG с прозрачностью и
              hotlink-изображения (imgbb и др.) — указывайте прямой https-URL к файлу.
            </p>
            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Заголовок</span>
              <input
                value={hero.title}
                onChange={(e) => setHero((h) => ({ ...h, title: e.target.value }))}
                className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Подзаголовок</span>
              <input
                value={hero.subtitle}
                onChange={(e) => setHero((h) => ({ ...h, subtitle: e.target.value }))}
                className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
              />
            </label>

            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Фон</span>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="radio"
                    name="bgKind"
                    checked={hero.bgKind === "gradient"}
                    onChange={() => setHero((h) => ({ ...h, bgKind: "gradient" }))}
                  />
                  Градиент (3 цвета)
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="radio"
                    name="bgKind"
                    checked={hero.bgKind === "image"}
                    onChange={() => setHero((h) => ({ ...h, bgKind: "image" }))}
                  />
                  Картинка по URL
                </label>
              </div>
            </div>

            {hero.bgKind === "gradient" ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block space-y-1">
                  <span className="text-xs text-zinc-500">Цвет 1 (#hex)</span>
                  <input
                    value={hero.gradientFrom}
                    onChange={(e) => setHero((h) => ({ ...h, gradientFrom: e.target.value }))}
                    className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 font-mono text-sm text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-zinc-500">Цвет 2</span>
                  <input
                    value={hero.gradientVia}
                    onChange={(e) => setHero((h) => ({ ...h, gradientVia: e.target.value }))}
                    className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 font-mono text-sm text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-zinc-500">Цвет 3</span>
                  <input
                    value={hero.gradientTo}
                    onChange={(e) => setHero((h) => ({ ...h, gradientTo: e.target.value }))}
                    className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 font-mono text-sm text-white"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-xs text-zinc-500">URL изображения (https или путь /…)</span>
                  <input
                    value={hero.bgImageUrl}
                    onChange={(e) => setHero((h) => ({ ...h, bgImageUrl: e.target.value }))}
                    placeholder="https://…"
                    className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 font-mono text-sm text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-zinc-500">
                    Затемнение поверх фото: {Math.round(hero.bgImageOverlay * 100)}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={0.95}
                    step={0.05}
                    value={hero.bgImageOverlay}
                    onChange={(e) =>
                      setHero((h) => ({ ...h, bgImageOverlay: Number(e.target.value) }))
                    }
                    className="w-full"
                  />
                </label>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Кнопки</span>
                <button
                  type="button"
                  disabled={hero.buttons.length >= 8}
                  onClick={addButton}
                  className="rounded-lg border border-zinc-600 px-3 py-1 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-40"
                >
                  + Добавить
                </button>
              </div>
              {hero.buttons.map((b, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-lg border border-cb-stroke bg-black/20 p-3 sm:flex-row sm:items-end">
                  <label className="min-w-0 flex-1 space-y-1">
                    <span className="text-xs text-zinc-500">Текст</span>
                    <input
                      value={b.label}
                      onChange={(e) => setButton(i, { label: e.target.value })}
                      className="w-full rounded border border-cb-stroke bg-black/40 px-2 py-1.5 text-sm text-white"
                    />
                  </label>
                  <label className="min-w-0 flex-[1.2] space-y-1">
                    <span className="text-xs text-zinc-500">Ссылка</span>
                    <input
                      value={b.href}
                      onChange={(e) => setButton(i, { href: e.target.value })}
                      placeholder="/profile"
                      className="w-full rounded border border-cb-stroke bg-black/40 px-2 py-1.5 font-mono text-sm text-white"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeButton(i)}
                    className="shrink-0 rounded border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950/40"
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-4 rounded-xl border border-zinc-700/60 bg-zinc-900/40 p-4">
              <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={hero.carouselEnabled}
                  onChange={(e) => setHero((h) => ({ ...h, carouselEnabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-cb-stroke"
                />
                <span className="font-semibold">Карусель картинок на банере (справа от таймера)</span>
              </label>
              <p className="text-xs text-zinc-500">
                Пока выключено — показываются декоративные иконки. Включите и добавьте хотя бы один URL картинки
                (рекомендуется PNG). Можно добавить до 12 слайдов; на сайте — точки, стрелки и автопрокрутка раз в 7 с.
              </p>
              {hero.carouselEnabled ? (
                <>
                  <label className="block space-y-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Масштаб картинки в карусели на банере (%)
                    </span>
                    <input
                      type="number"
                      min={40}
                      max={180}
                      value={hero.carouselImageScalePct}
                      onChange={(e) =>
                        setHero((h) => ({
                          ...h,
                          carouselImageScalePct: Math.min(
                            180,
                            Math.max(40, Math.round(Number(e.target.value) || 100)),
                          ),
                        }))
                      }
                      className="w-full max-w-xs rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
                    />
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Слайды</span>
                    <button
                      type="button"
                      disabled={hero.carouselSlides.length >= 12}
                      onClick={addCarouselSlide}
                      className="rounded-lg border border-zinc-600 px-3 py-1 text-xs text-zinc-300 hover:bg-white/5 disabled:opacity-40"
                    >
                      + Слайд
                    </button>
                  </div>
                  {hero.carouselSlides.map((s, i) => (
                    <div
                      key={i}
                      className="space-y-2 rounded-lg border border-cb-stroke bg-black/25 p-3"
                    >
                      <label className="block space-y-1">
                        <span className="text-xs text-zinc-500">URL изображения (https…)</span>
                        <input
                          value={s.imageUrl}
                          onChange={(e) => setCarouselSlide(i, { imageUrl: e.target.value })}
                          placeholder="https://i.ibb.co/…/image.png"
                          className="w-full rounded border border-cb-stroke bg-black/40 px-2 py-1.5 font-mono text-xs text-white sm:text-sm"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs text-zinc-500">Подпись (alt, необязательно)</span>
                        <input
                          value={s.alt}
                          onChange={(e) => setCarouselSlide(i, { alt: e.target.value })}
                          className="w-full rounded border border-cb-stroke bg-black/40 px-2 py-1.5 text-sm text-white"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs text-zinc-500">Ссылка при клике (необязательно)</span>
                        <input
                          value={s.href}
                          onChange={(e) => setCarouselSlide(i, { href: e.target.value })}
                          placeholder="/cases или https://…"
                          className="w-full rounded border border-cb-stroke bg-black/40 px-2 py-1.5 font-mono text-sm text-white"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs text-zinc-500">Текст на слайде (необязательно)</span>
                        <input
                          value={s.caption ?? ""}
                          onChange={(e) => setCarouselSlide(i, { caption: e.target.value })}
                          placeholder="Заголовок над картинкой"
                          className="w-full rounded border border-cb-stroke bg-black/40 px-2 py-1.5 text-sm text-white"
                        />
                      </label>
                      <div className="space-y-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                          Фон области слайда
                        </span>
                        <div className="flex flex-wrap gap-3 text-sm text-zinc-300">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`slide-bg-${i}`}
                              checked={(s.slideBgKind ?? "none") === "none"}
                              onChange={() => setCarouselSlide(i, { slideBgKind: "none" })}
                            />
                            Нет
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`slide-bg-${i}`}
                              checked={s.slideBgKind === "gradient"}
                              onChange={() => setCarouselSlide(i, { slideBgKind: "gradient" })}
                            />
                            Градиент
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`slide-bg-${i}`}
                              checked={s.slideBgKind === "image"}
                              onChange={() => setCarouselSlide(i, { slideBgKind: "image" })}
                            />
                            Картинка
                          </label>
                        </div>
                        {s.slideBgKind === "gradient" ? (
                          <div className="grid gap-2 sm:grid-cols-3">
                            <label className="block space-y-1">
                              <span className="text-[10px] text-zinc-500">Цвет 1</span>
                              <input
                                value={s.slideGradientFrom ?? ""}
                                onChange={(e) => setCarouselSlide(i, { slideGradientFrom: e.target.value })}
                                className="w-full rounded border border-cb-stroke bg-black/40 px-2 py-1 font-mono text-xs text-white"
                              />
                            </label>
                            <label className="block space-y-1">
                              <span className="text-[10px] text-zinc-500">Цвет 2</span>
                              <input
                                value={s.slideGradientVia ?? ""}
                                onChange={(e) => setCarouselSlide(i, { slideGradientVia: e.target.value })}
                                className="w-full rounded border border-cb-stroke bg-black/40 px-2 py-1 font-mono text-xs text-white"
                              />
                            </label>
                            <label className="block space-y-1">
                              <span className="text-[10px] text-zinc-500">Цвет 3</span>
                              <input
                                value={s.slideGradientTo ?? ""}
                                onChange={(e) => setCarouselSlide(i, { slideGradientTo: e.target.value })}
                                className="w-full rounded border border-cb-stroke bg-black/40 px-2 py-1 font-mono text-xs text-white"
                              />
                            </label>
                          </div>
                        ) : null}
                        {s.slideBgKind === "image" ? (
                          <div className="space-y-2">
                            <label className="block space-y-1">
                              <span className="text-xs text-zinc-500">URL фона (https…)</span>
                              <input
                                value={s.slideBgImageUrl ?? ""}
                                onChange={(e) => setCarouselSlide(i, { slideBgImageUrl: e.target.value })}
                                className="w-full rounded border border-cb-stroke bg-black/40 px-2 py-1.5 font-mono text-xs text-white"
                              />
                            </label>
                            <label className="block space-y-1">
                              <span className="text-xs text-zinc-500">
                                Затемнение: {Math.round((s.slideBgOverlay ?? 0.45) * 100)}%
                              </span>
                              <input
                                type="range"
                                min={0}
                                max={0.95}
                                step={0.05}
                                value={s.slideBgOverlay ?? 0.45}
                                onChange={(e) =>
                                  setCarouselSlide(i, { slideBgOverlay: Number(e.target.value) })
                                }
                                className="w-full"
                              />
                            </label>
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCarouselSlide(i)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Удалить слайд
                      </button>
                    </div>
                  ))}
                </>
              ) : null}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Крипто-пополнение</h2>
            <label className="block space-y-1">
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
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Картки на главной</h2>
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
          </section>

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
