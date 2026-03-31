"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SiteShell } from "@/components/SiteShell";
import { apiFetch, getToken } from "@/lib/api";

type Message = {
  id: string;
  from: string;
  body: string;
  at: string;
  authorName?: string;
};

type Ticket = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};

export default function SupportTicketPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || "");

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    if (!getToken() || !id) return;
    const r = await apiFetch<{ ticket: Ticket }>(`/api/support/tickets/${encodeURIComponent(id)}`);
    if (!r.ok) {
      setErr(r.error || "Ошибка");
      setTicket(null);
      return;
    }
    setTicket(r.data?.ticket || null);
    setErr(null);
  }, [id]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/support");
      return;
    }
    void load();
  }, [load, router]);

  useEffect(() => {
    function onThreadRefresh(e: Event) {
      const tid = (e as CustomEvent<{ ticketId?: string }>).detail?.ticketId;
      if (tid === id) void load();
    }
    window.addEventListener("cd-support-ticket-refresh", onThreadRefresh as EventListener);
    return () => window.removeEventListener("cd-support-ticket-refresh", onThreadRefresh as EventListener);
  }, [load, id]);

  const isOpen = ticket?.status === "open";

  async function sendReply() {
    const text = reply.trim();
    if (text.length < 2 || !id) return;
    setSending(true);
    setActionErr(null);
    const r = await apiFetch<{ ticket: Ticket }>(
      `/api/support/tickets/${encodeURIComponent(id)}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      }
    );
    setSending(false);
    if (!r.ok) {
      setActionErr(r.error || "Ошибка отправки");
      return;
    }
    setReply("");
    setTicket(r.data?.ticket ?? null);
  }

  async function closeTicket() {
    if (!id) return;
    setClosing(true);
    setActionErr(null);
    const r = await apiFetch<{ ticket: Ticket }>(
      `/api/support/tickets/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      }
    );
    setClosing(false);
    if (!r.ok) {
      setActionErr(r.error || "Не удалось закрыть");
      return;
    }
    setTicket(r.data?.ticket ?? null);
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
        <Link href="/support" className="text-sm text-sky-400/90 hover:text-sky-300">
          ← Все обращения
        </Link>
        {err && <p className="text-sm text-red-300">{err}</p>}
        {actionErr && <p className="text-sm text-amber-300">{actionErr}</p>}
        {ticket && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-white">{ticket.subject}</h1>
              <p className="mt-1 text-xs text-zinc-500">
                Статус:{" "}
                {ticket.status === "open" ? (
                  <span className="text-sky-400">открыто</span>
                ) : (
                  <span>закрыто</span>
                )}
              </p>
            </div>
            <ul className="space-y-3">
              {ticket.messages?.map((m) => (
                <li
                  key={m.id}
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    m.from === "staff"
                      ? "border-sky-500/35 bg-sky-950/25 text-zinc-100"
                      : "border-cb-stroke/80 bg-cb-panel/20 text-zinc-200"
                  }`}
                >
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wider text-zinc-500">
                    <span>{m.from === "staff" ? `Поддержка${m.authorName ? `: ${m.authorName}` : ""}` : "Вы"}</span>
                    <span>{new Date(m.at).toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{m.body}</p>
                </li>
              ))}
            </ul>
            {isOpen && (
              <div className="space-y-3 border-t border-cb-stroke/60 pt-4">
                <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Ответ в поддержку
                </label>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  maxLength={8000}
                  placeholder="Напишите сообщение…"
                  className="w-full resize-y rounded-xl border border-cb-stroke/80 bg-cb-panel/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={sending || reply.trim().length < 2}
                    onClick={() => void sendReply()}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sending ? "Отправка…" : "Отправить"}
                  </button>
                  <button
                    type="button"
                    disabled={closing}
                    onClick={() => void closeTicket()}
                    className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {closing ? "Закрытие…" : "Закрыть обращение"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
