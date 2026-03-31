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

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
        <Link href="/support" className="text-sm text-sky-400/90 hover:text-sky-300">
          ← Все обращения
        </Link>
        {err && <p className="text-sm text-red-300">{err}</p>}
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
          </div>
        )}
      </div>
    </SiteShell>
  );
}
