"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type FaqAdminItem = {
  id: string;
  question: string;
  answer: string;
  order: number;
  active: boolean;
  updatedAt?: string;
};

export default function AdminPartnerFaqPage() {
  const [items, setItems] = useState<FaqAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [nq, setNq] = useState("");
  const [na, setNa] = useState("");
  const [adding, setAdding] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [eq, setEq] = useState("");
  const [ea, setEa] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const r = await apiFetch<{ items: FaqAdminItem[] }>("/api/admin/partner-faq");
    setLoading(false);
    if (!r.ok) {
      setErr(r.error || "Не удалось загрузить");
      return;
    }
    setItems(r.data?.items ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    if (!nq.trim() || !na.trim()) {
      setErr("Заполните вопрос и ответ");
      return;
    }
    setErr(null);
    setAdding(true);
    const r = await apiFetch<{ item: FaqAdminItem }>("/api/admin/partner-faq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: nq.trim(), answer: na.trim(), active: true }),
    });
    setAdding(false);
    if (!r.ok) {
      setErr(r.error || "Ошибка сохранения");
      return;
    }
    setNq("");
    setNa("");
    await load();
  }

  function startEdit(it: FaqAdminItem) {
    setEditId(it.id);
    setEq(it.question);
    setEa(it.answer);
    setErr(null);
  }

  async function saveEdit() {
    if (!editId) return;
    if (!eq.trim() || !ea.trim()) {
      setErr("Заполните вопрос и ответ");
      return;
    }
    setErr(null);
    setBusyId(editId);
    const r = await apiFetch<{ item: FaqAdminItem }>(`/api/admin/partner-faq/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: eq.trim(), answer: ea.trim() }),
    });
    setBusyId(null);
    if (!r.ok) {
      setErr(r.error || "Ошибка сохранения");
      return;
    }
    setEditId(null);
    await load();
  }

  async function toggleActive(it: FaqAdminItem) {
    setBusyId(it.id);
    const r = await apiFetch<{ item: FaqAdminItem }>(`/api/admin/partner-faq/${it.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !it.active }),
    });
    setBusyId(null);
    if (!r.ok) {
      setErr(r.error || "Ошибка");
      return;
    }
    await load();
  }

  async function remove(it: FaqAdminItem) {
    if (!window.confirm(`Удалить вопрос «${it.question.slice(0, 60)}»?`)) return;
    setBusyId(it.id);
    const r = await apiFetch(`/api/admin/partner-faq/${it.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!r.ok) {
      setErr(r.error || "Ошибка удаления");
      return;
    }
    if (editId === it.id) setEditId(null);
    await load();
  }

  async function move(it: FaqAdminItem, dir: -1 | 1) {
    const idx = items.findIndex((x) => x.id === it.id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= items.length) return;
    const next = [...items];
    const tmp = next[idx];
    next[idx] = next[j];
    next[j] = tmp;
    setBusyId("reorder");
    const r = await apiFetch("/api/admin/partner-faq/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((x) => x.id) }),
    });
    setBusyId(null);
    if (!r.ok) {
      setErr(r.error || "Не удалось сохранить порядок");
      await load();
      return;
    }
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">F.A.Q партнеров</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          Тексты показываются на вкладке <span className="font-mono text-zinc-300">F.A.Q</span> в{" "}
          <span className="text-zinc-300">кабинете партнёра</span>: аккордеон «Ответы на вопросы». Неактивные пункты
          в кабинете скрыты.
        </p>
        <p className="mt-3 text-sm text-zinc-500">
          <Link
            href="/partner?tab=faq"
            className="font-medium text-cb-flame/95 underline-offset-2 hover:underline"
          >
            Открыть кабинет партнёра на вкладке F.A.Q
          </Link>{" "}
          (нужен профиль партнёра).
        </p>
      </div>

      {err && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {err}
        </div>
      )}

      <section className="rounded-2xl border border-white/[0.08] bg-[#0c0c0c]/90 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Новый вопрос</h2>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-zinc-500">
            Вопрос
            <input
              value={nq}
              onChange={(e) => setNq(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/[0.1] bg-[#111] px-3 py-2.5 text-sm text-zinc-100 focus:border-cb-flame/40 focus:outline-none focus:ring-1 focus:ring-cb-flame/30"
              placeholder="Например: Как получить личный промокод?"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-500">
            Ответ
            <textarea
              value={na}
              onChange={(e) => setNa(e.target.value)}
              rows={5}
              className="mt-1 w-full resize-y rounded-xl border border-white/[0.1] bg-[#111] px-3 py-2.5 text-sm leading-relaxed text-zinc-100 focus:border-cb-flame/40 focus:outline-none focus:ring-1 focus:ring-cb-flame/30"
              placeholder="Полный текст ответа для партнёра…"
            />
          </label>
          <button
            type="button"
            onClick={() => void add()}
            disabled={adding}
            className="rounded-xl border border-cb-flame/40 bg-cb-flame/15 px-4 py-2.5 text-sm font-semibold text-cb-flame transition hover:bg-cb-flame/25 disabled:opacity-50"
          >
            {adding ? "Добавление…" : "Добавить"}
          </button>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-zinc-500">Загрузка…</p>
      ) : (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Список ({items.length})</h2>
          {!items.length ? (
            <p className="text-sm text-zinc-500">Пока пусто — добавьте первый вопрос выше.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((it, idx) => (
                <li
                  key={it.id}
                  className="rounded-2xl border border-white/[0.07] bg-[#0c0c0c]/95 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5"
                >
                  {editId === it.id ? (
                    <div className="space-y-3">
                      <input
                        value={eq}
                        onChange={(e) => setEq(e.target.value)}
                        className="w-full rounded-xl border border-white/[0.1] bg-[#111] px-3 py-2.5 text-sm font-semibold text-white focus:border-cb-flame/40 focus:outline-none"
                      />
                      <textarea
                        value={ea}
                        onChange={(e) => setEa(e.target.value)}
                        rows={6}
                        className="w-full resize-y rounded-xl border border-white/[0.1] bg-[#111] px-3 py-2.5 text-sm text-zinc-200 focus:border-cb-flame/40 focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void saveEdit()}
                          disabled={busyId === it.id}
                          className="rounded-lg border border-emerald-500/35 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/40 disabled:opacity-50"
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditId(null);
                            setErr(null);
                          }}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:bg-white/[0.04]"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-mono text-zinc-600">
                            #{idx + 1} · order {it.order}
                            {it.updatedAt ? (
                              <span className="text-zinc-700">
                                {" "}
                                · обн. {new Date(it.updatedAt).toLocaleString("ru-RU")}
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-1 text-[15px] font-semibold text-white">{it.question}</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">{it.answer}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                            it.active ? "bg-emerald-950/50 text-emerald-300" : "bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {it.active ? "в кабинете" : "скрыт"}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(it)}
                          disabled={busyId !== null}
                          className="rounded-lg border border-white/[0.1] px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/[0.05] disabled:opacity-40"
                        >
                          Редактировать
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleActive(it)}
                          disabled={busyId === it.id}
                          className="rounded-lg border border-white/[0.1] px-3 py-2 text-xs text-zinc-400 hover:bg-white/[0.05] disabled:opacity-40"
                        >
                          {it.active ? "Скрыть" : "Показать"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void move(it, -1)}
                          disabled={busyId !== null || idx === 0}
                          className="rounded-lg border border-white/[0.1] px-3 py-2 text-xs text-zinc-500 hover:bg-white/[0.05] disabled:opacity-40"
                        >
                          Вверх
                        </button>
                        <button
                          type="button"
                          onClick={() => void move(it, 1)}
                          disabled={busyId !== null || idx >= items.length - 1}
                          className="rounded-lg border border-white/[0.1] px-3 py-2 text-xs text-zinc-500 hover:bg-white/[0.05] disabled:opacity-40"
                        >
                          Вниз
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(it)}
                          disabled={busyId === it.id}
                          className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300/90 hover:bg-red-950/30 disabled:opacity-40"
                        >
                          Удалить
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
