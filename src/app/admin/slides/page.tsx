"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { normalizeHomeSlide, type HomeSlide } from "@/lib/slides";
import { ImgbbUploadButton } from "@/components/admin/ImgbbUploadButton";

type AdminSlidesResponse = {
  slides: HomeSlide[];
};

function blankDraft(): Omit<HomeSlide, "id" | "updatedAt"> {
  return {
    title: "Новый баннер",
    subtitle: "",
    buttonText: "Открыть",
    buttonLink: "/cases",
    backgroundImage: "linear-gradient(135deg, #0b1020 0%, #102a52 45%, #2f0f3a 100%)",
    foregroundImage: "",
    overlayOpacity: 0.35,
    isActive: true,
    order: 0,
  };
}

export default function AdminSlidesPage() {
  const [slides, setSlides] = useState<HomeSlide[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch<AdminSlidesResponse>("/api/admin/slides");
    setLoading(false);
    if (!r.ok) {
      setErr(r.error || "Не удалось загрузить слайды");
      return;
    }
    const rows = (r.data?.slides ?? [])
      .map((s, i) => normalizeHomeSlide(s, i))
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    setSlides(rows);
    setErr(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ordered = useMemo(
    () => [...slides].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
    [slides],
  );

  async function createSlide() {
    setErr(null);
    const r = await apiFetch<{ slide?: HomeSlide; slides?: HomeSlide[] }>("/api/admin/slides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blankDraft()),
    });
    if (!r.ok) {
      setErr(r.error || "Не удалось создать слайд");
      return;
    }
    if (r.data?.slides) {
      setSlides(r.data.slides.map((s, i) => normalizeHomeSlide(s, i)));
    } else {
      await load();
    }
    window.dispatchEvent(new CustomEvent("cd-slides-updated"));
  }

  function patchLocal(id: string, patch: Partial<HomeSlide>) {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function saveSlide(id: string) {
    const cur = slides.find((s) => s.id === id);
    if (!cur) return;
    setBusyId(id);
    setErr(null);
    const ov = Number(cur.overlayOpacity);
    const overlayOpacity = Number.isFinite(ov)
      ? Math.min(0.9, Math.max(0, Math.round(ov * 1000) / 1000))
      : 0.35;
    const r = await apiFetch<{ slide?: HomeSlide; slides?: HomeSlide[] }>(`/api/admin/slides/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: cur.title,
        subtitle: cur.subtitle,
        buttonText: cur.buttonText,
        buttonLink: cur.buttonLink,
        backgroundImage: cur.backgroundImage,
        foregroundImage: cur.foregroundImage,
        overlayOpacity,
        isActive: cur.isActive,
      }),
    });
    setBusyId(null);
    if (!r.ok) {
      setErr(r.error || "Ошибка сохранения");
      return;
    }
    if (r.data?.slides) {
      setSlides(r.data.slides.map((s, i) => normalizeHomeSlide(s, i)));
    } else {
      await load();
    }
    window.dispatchEvent(new CustomEvent("cd-slides-updated"));
  }

  async function removeSlide(id: string) {
    setBusyId(id);
    setErr(null);
    const r = await apiFetch<{ ok?: boolean; slides?: HomeSlide[] }>(`/api/admin/slides/${id}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (!r.ok) {
      setErr(r.error || "Не удалось удалить");
      return;
    }
    if (r.data?.slides) {
      setSlides(r.data.slides.map((s, i) => normalizeHomeSlide(s, i)));
    } else {
      setSlides((prev) => prev.filter((s) => s.id !== id));
    }
    window.dispatchEvent(new CustomEvent("cd-slides-updated"));
  }

  async function reorderByIds(ids: string[]) {
    setErr(null);
    const r = await apiFetch<{ slides?: HomeSlide[] }>("/api/admin/slides/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!r.ok) {
      setErr(r.error || "Не удалось изменить порядок");
      return;
    }
    if (r.data?.slides) {
      setSlides(r.data.slides.map((s, i) => normalizeHomeSlide(s, i)));
    } else {
      await load();
    }
    window.dispatchEvent(new CustomEvent("cd-slides-updated"));
  }

  function move(id: string, direction: "up" | "down") {
    const list = [...ordered];
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= list.length) return;
    [list[idx], list[swap]] = [list[swap], list[idx]];
    void reorderByIds(list.map((s) => s.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Слайдер головної</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Повний CRUD банерів: порядок, активність, тексти, посилання і зображення.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void createSlide()}
          className="rounded-xl bg-gradient-to-r from-red-700 to-cb-flame px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-900/25 hover:brightness-110"
        >
          + Додати слайд
        </button>
      </div>

      {err && <p className="text-sm text-red-400">{err}</p>}
      {loading ? <p className="text-zinc-400">Завантаження...</p> : null}

      {!loading && ordered.length === 0 ? (
        <div className="rounded-xl border border-cb-stroke bg-cb-panel/30 p-4 text-sm text-zinc-300">
          Слайдів поки немає. Додайте перший банер кнопкою вище.
        </div>
      ) : null}

      <div className="space-y-4">
        {ordered.map((s, idx) => (
          <div key={s.id} className="rounded-2xl border border-cb-stroke bg-cb-panel/35 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded bg-black/35 px-2 py-1 text-xs font-semibold text-zinc-300">
                  #{idx + 1}
                </span>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  <input
                    type="checkbox"
                    checked={s.isActive}
                    onChange={(e) => patchLocal(s.id, { isActive: e.target.checked })}
                  />
                  Active
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => move(s.id, "up")}
                  className="rounded border border-cb-stroke/80 bg-black/35 px-2 py-1 text-xs text-zinc-200 hover:border-cb-flame/45 disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={idx === ordered.length - 1}
                  onClick={() => move(s.id, "down")}
                  className="rounded border border-cb-stroke/80 bg-black/35 px-2 py-1 text-xs text-zinc-200 hover:border-cb-flame/45 disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => void removeSlide(s.id)}
                  disabled={busyId === s.id}
                  className="rounded border border-red-500/45 bg-red-950/35 px-3 py-1 text-xs font-semibold text-red-200 hover:bg-red-950/55 disabled:opacity-50"
                >
                  Видалити
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-zinc-400">Title</span>
                <textarea
                  value={s.title}
                  onChange={(e) => patchLocal(s.id, { title: e.target.value })}
                  rows={3}
                  placeholder="Можна з переносом рядка (Enter)"
                  className="w-full resize-y rounded-lg border border-cb-stroke bg-black/35 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-400">Subtitle</span>
                <input
                  value={s.subtitle}
                  onChange={(e) => patchLocal(s.id, { subtitle: e.target.value })}
                  className="w-full rounded-lg border border-cb-stroke bg-black/35 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-400">Button Text</span>
                <input
                  value={s.buttonText}
                  onChange={(e) => patchLocal(s.id, { buttonText: e.target.value })}
                  className="w-full rounded-lg border border-cb-stroke bg-black/35 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-zinc-400">Button Link</span>
                <input
                  value={s.buttonLink}
                  onChange={(e) => patchLocal(s.id, { buttonLink: e.target.value })}
                  placeholder="/cases або https://..."
                  className="w-full rounded-lg border border-cb-stroke bg-black/35 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-zinc-400">Background (URL або gradient)</span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <input
                    value={s.backgroundImage}
                    onChange={(e) => patchLocal(s.id, { backgroundImage: e.target.value })}
                    placeholder="https://... або linear-gradient(...)"
                    className="w-full rounded-lg border border-cb-stroke bg-black/35 px-3 py-2 text-sm text-white"
                  />
                  <ImgbbUploadButton
                    nameHint={`slide-bg-${idx + 1}`}
                    onUploaded={(url) => patchLocal(s.id, { backgroundImage: url })}
                    className="shrink-0 rounded-lg border border-violet-500/40 bg-violet-950/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-violet-200 transition hover:bg-violet-900/50"
                  >
                    Upload i.ibb.co
                  </ImgbbUploadButton>
                </div>
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-zinc-400">Foreground Image URL</span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <input
                    value={s.foregroundImage}
                    onChange={(e) => patchLocal(s.id, { foregroundImage: e.target.value })}
                    placeholder="https://...png"
                    className="w-full rounded-lg border border-cb-stroke bg-black/35 px-3 py-2 text-sm text-white"
                  />
                  <ImgbbUploadButton
                    nameHint={`slide-fg-${idx + 1}`}
                    onUploaded={(url) => patchLocal(s.id, { foregroundImage: url })}
                    className="shrink-0 rounded-lg border border-violet-500/40 bg-violet-950/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-violet-200 transition hover:bg-violet-900/50"
                  >
                    Upload i.ibb.co
                  </ImgbbUploadButton>
                </div>
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-zinc-400">
                  Затемнення банера: {Math.round((s.overlayOpacity ?? 0.35) * 100)}%
                </span>
                <input
                  type="range"
                  min={0}
                  max={0.9}
                  step={0.05}
                  value={s.overlayOpacity ?? 0.35}
                  onChange={(e) => patchLocal(s.id, { overlayOpacity: Number(e.target.value) })}
                  className="w-full"
                />
              </label>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => void saveSlide(s.id)}
                disabled={busyId === s.id}
                className="rounded-lg bg-gradient-to-r from-red-700 to-cb-flame px-4 py-2 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
              >
                {busyId === s.id ? "Збереження..." : "Зберегти"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
