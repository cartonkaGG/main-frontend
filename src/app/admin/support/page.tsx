"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Message = {
  id: string;
  from: string;
  body: string;
  at: string;
  authorName?: string;
  authorSteamId?: string;
};

type TicketSummary = {
  id: string;
  steamId: string;
  displayName: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

type TicketFull = TicketSummary & {
  userSub: string;
  messages: Message[];
};

export default function AdminSupportPage() {
  const [rows, setRows] = useState<TicketSummary[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<TicketFull | null>(null);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    const r = await apiFetch<{ tickets: TicketSummary[] }>("/api/admin/support/tickets");
    if (!r.ok) {
      setLoadErr(r.error || "Не удалось загрузить");
      return;
    }
    setRows(r.data?.tickets || []);
    setLoadErr(null);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function openDetail(id: string) {
    setDetailErr(null);
    setSelected(null);
    setReply("");
    const r = await apiFetch<{ ticket: TicketFull }>(
      `/api/admin/support/tickets/${encodeURIComponent(id)}`,
    );
    if (!r.ok) {
      setDetailErr(r.error || "Ошибка");
      return;
    }
    setSelected(r.data?.ticket || null);
  }

  async function sendPatch(body: Record<string, unknown>) {
    if (!selected) return;
    setActionBusy(true);
    setActionErr(null);
    const r = await apiFetch<{ ticket: TicketFull }>(
      `/api/admin/support/tickets/${encodeURIComponent(selected.id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    setActionBusy(false);
    if (!r.ok) {
      setActionErr(r.error || "Ошибка");
      return;
    }
    setSelected(r.data?.ticket || selected);
    await loadList();
    setReply("");
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Обращения пользователей</h1>

      {loadErr && <p className="text-sm text-red-300">{loadErr}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-cb-stroke bg-cb-panel/25">
          <div className="border-b border-cb-stroke/80 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">
            Список
          </div>
          <ul className="max-h-[min(60vh,520px)] divide-y divide-cb-stroke/40 overflow-y-auto">
            {rows.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-zinc-500">Пока нет обращений</li>
            ) : (
              rows.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => void openDetail(t.id)}
                    className={`flex w-full flex-col items-start gap-1 px-4 py-3 text-left text-sm transition hover:bg-white/5 ${
                      selected?.id === t.id ? "bg-sky-950/30" : ""
                    }`}
                  >
                    <span className="font-medium text-zinc-100">{t.subject}</span>
                    <span className="text-xs text-zinc-500">
                      {t.displayName || "—"} · {t.steamId || t.id.slice(0, 8)}
                    </span>
                    <span className="text-[11px] text-zinc-600">
                      {t.status === "open" ? (
                        <span className="text-sky-400">открыто</span>
                      ) : (
                        "закрыто"
                      )}{" "}
                      · {new Date(t.updatedAt).toLocaleString()}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-cb-stroke bg-cb-panel/25 p-5">
          {detailErr && <p className="text-sm text-red-300">{detailErr}</p>}
          {!selected && !detailErr ? (
            <p className="text-sm text-zinc-500">Выберите обращение слева.</p>
          ) : null}
          {selected && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">{selected.subject}</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {selected.displayName} · <span className="font-mono">{selected.steamId}</span>
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Статус:{" "}
                  {selected.status === "open" ? (
                    <span className="text-sky-400">открыто</span>
                  ) : (
                    "закрыто"
                  )}
                </p>
              </div>
              <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-cb-stroke/60 bg-black/20 p-3">
                {selected.messages?.map((m) => (
                  <li
                    key={m.id}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      m.from === "staff" ? "bg-sky-950/35 text-zinc-100" : "bg-zinc-900/40 text-zinc-300"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                      {m.from === "staff"
                        ? `Поддержка${m.authorName ? ` · ${m.authorName}` : ""}`
                        : "Пользователь"}{" "}
                      · {new Date(m.at).toLocaleString()}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                  </li>
                ))}
              </ul>

              <label className="block space-y-2">
                <span className="text-xs font-bold text-zinc-500">Ответ</span>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  className="w-full resize-y rounded-xl border border-cb-stroke bg-black/35 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/55"
                  placeholder="Текст ответа пользователю"
                  maxLength={8000}
                />
              </label>
              {actionErr && <p className="text-sm text-red-300">{actionErr}</p>}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={actionBusy || !reply.trim()}
                  onClick={() => void sendPatch({ reply: reply.trim() })}
                  className="rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-50"
                >
                  Отправить ответ
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() =>
                    void sendPatch({ status: selected.status === "open" ? "closed" : "open" })
                  }
                  className="rounded-xl border border-cb-stroke bg-zinc-900/50 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800/60 disabled:opacity-50"
                >
                  {selected.status === "open" ? "Закрыть" : "Открыть снова"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
