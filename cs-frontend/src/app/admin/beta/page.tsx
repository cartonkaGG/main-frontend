"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Application = {
  userId: string;
  steamId: string;
  displayName: string;
  avatar: string;
  betaAppliedAt: string | null;
  betaApplicationMessage: string | null;
  createdAt?: string | null;
};

export default function AdminBetaPage() {
  const [list, setList] = useState<Application[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const r = await apiFetch<{ applications: Application[] }>("/api/admin/beta/pending");
    setLoading(false);
    if (!r.ok) {
      setErr(r.error || "Не удалось загрузить");
      setList([]);
      return;
    }
    setList(Array.isArray(r.data?.applications) ? r.data!.applications : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(userKey: string) {
    setBusyId(userKey);
    setErr(null);
    const r = await apiFetch<{ ok?: boolean }>(`/api/admin/beta/${encodeURIComponent(userKey)}/approve`, {
      method: "POST",
    });
    setBusyId(null);
    if (!r.ok) {
      setErr(r.error || "Ошибка");
      return;
    }
    void load();
  }

  async function reject(userKey: string) {
    setBusyId(userKey);
    setErr(null);
    const r = await apiFetch<{ ok?: boolean }>(`/api/admin/beta/${encodeURIComponent(userKey)}/reject`, {
      method: "POST",
    });
    setBusyId(null);
    if (!r.ok) {
      setErr(r.error || "Ошибка");
      return;
    }
    void load();
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">Заявки на бета-доступ</h1>
      <p className="mb-8 max-w-2xl text-sm text-zinc-400">
        Включите режим на бэкенде: <code className="rounded bg-black/40 px-1.5 py-0.5 text-zinc-300">CLOSED_BETA=1</code>.
        Новые пользователи получают статус заявки; уже существующие без поля <code className="text-zinc-500">betaStatus</code>{" "}
        остаются с доступом.
      </p>

      {err ? <p className="mb-4 text-sm text-red-300">{err}</p> : null}

      {loading ? (
        <p className="text-zinc-500">Загрузка…</p>
      ) : list.length === 0 ? (
        <p className="text-zinc-500">Нет заявок в статусе «ожидание».</p>
      ) : (
        <ul className="space-y-4">
          {list.map((a) => {
            const key = a.userId || a.steamId;
            const busy = busyId === key;
            return (
              <li
                key={key}
                className="flex flex-col gap-3 rounded-xl border border-cb-stroke/70 bg-black/35 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-left">
                  <p className="font-medium text-white">{a.displayName || a.steamId}</p>
                  <p className="font-mono text-xs text-zinc-500">steamId: {a.steamId}</p>
                  {a.betaAppliedAt ? (
                    <p className="mt-1 text-xs text-zinc-600">
                      Заявка: {new Date(a.betaAppliedAt).toLocaleString("ru-RU")}
                    </p>
                  ) : null}
                  {a.betaApplicationMessage ? (
                    <p className="mt-2 text-sm text-zinc-400">&ldquo;{a.betaApplicationMessage}&rdquo;</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void approve(key)}
                    className="rounded-lg bg-emerald-900/80 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-800/90 disabled:opacity-45"
                  >
                    Принять
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void reject(key)}
                    className="rounded-lg border border-zinc-600 bg-black/40 px-4 py-2 text-sm text-zinc-300 transition hover:border-red-500/50 hover:text-red-200 disabled:opacity-45"
                  >
                    Отклонить
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
