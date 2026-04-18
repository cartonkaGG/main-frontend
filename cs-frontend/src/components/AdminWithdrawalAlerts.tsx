"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, getToken } from "@/lib/api";
import {
  diffAdminWithdrawalsForAlerts,
  loadAdminAlerts,
  loadAdminSnapState,
  mergeAdminAlerts,
  saveAdminAlerts,
  saveAdminSnap,
  type AdminWithdrawalListRow,
  type StoredAdminWdAlert,
} from "@/lib/adminWithdrawalAlerts";

const POLL_MS = 40_000;

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 12h-6l-2 3h-6l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

export function AdminWithdrawalAlerts() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StoredAdminWdAlert[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refreshList = useCallback(() => setItems(loadAdminAlerts()), []);

  const poll = useCallback(async () => {
    if (!getToken()) return;
    const r = await apiFetch<{ withdrawals: AdminWithdrawalListRow[] }>("/api/admin/withdrawals");
    if (!r.ok || !Array.isArray(r.data?.withdrawals)) return;
    const { map: prev, neverSaved } = loadAdminSnapState();
    const { nextSnap, newEvents } = diffAdminWithdrawalsForAlerts(
      r.data.withdrawals,
      prev,
      neverSaved,
    );
    saveAdminSnap(nextSnap);
    if (newEvents.length > 0) {
      const merged = mergeAdminAlerts(loadAdminAlerts(), newEvents);
      saveAdminAlerts(merged);
      setItems(merged);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!getToken()) return;
    void poll();
    const t = setInterval(() => void poll(), POLL_MS);
    const onFocus = () => void poll();
    const onPoll = () => void poll();
    window.addEventListener("focus", onFocus);
    window.addEventListener("cd-admin-withdrawals-poll", onPoll);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("cd-admin-withdrawals-poll", onPoll);
    };
  }, [poll]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }
  }, [open]);

  const unread = useMemo(() => items.filter((x) => !x.read).length, [items]);

  function markAllRead() {
    const next = items.map((x) => ({ ...x, read: true }));
    saveAdminAlerts(next);
    setItems(next);
  }

  function clearAll() {
    saveAdminAlerts([]);
    setItems([]);
  }

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-amber-600/45 bg-amber-950/20 text-amber-200/95 transition hover:border-amber-500/70 hover:bg-amber-950/35 hover:text-amber-100 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-500/45"
        aria-label="Заявки на вывод (админ)"
        title="Заявки на вывод"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <InboxIcon className="h-[21px] w-[21px]" />
        {unread > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black leading-none text-black shadow-[0_0_12px_rgba(245,158,11,0.5)]">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-[70] mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-amber-900/50 bg-zinc-950/98 shadow-2xl shadow-black/60 backdrop-blur-xl"
          role="dialog"
          aria-label="Уведомления администратора о выводах"
        >
          <div className="flex items-center justify-between border-b border-amber-900/40 px-3 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-200/80">Вывод скинов</p>
            <div className="flex gap-2">
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[10px] font-semibold uppercase tracking-wide text-amber-400 hover:underline"
                >
                  Прочитать все
                </button>
              ) : null}
              {items.length > 0 ? (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-300"
                >
                  Очистить
                </button>
              ) : null}
            </div>
          </div>
          <div className="max-h-[min(70vh,320px)] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs leading-relaxed text-zinc-500">
                Здесь появятся уведомления о новых заявках на вывод скинов.
              </p>
            ) : (
              <ul className="divide-y divide-cb-stroke/50">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={`px-3 py-2.5 ${n.read ? "opacity-75" : "bg-amber-950/20"}`}
                  >
                    <p className="text-[11px] font-bold leading-snug text-amber-300/95">
                      {n.title || "Уведомление"}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-zinc-200">{n.body}</p>
                    {n.detail ? (
                      <p className="mt-1 text-[10px] leading-snug text-zinc-500">{n.detail}</p>
                    ) : null}
                    <p className="mt-1 font-mono text-[9px] text-zinc-600">
                      {new Date(n.at).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-amber-900/40 px-3 py-2">
            <Link
              href="/admin/withdrawals"
              className="block text-center text-[11px] font-semibold text-amber-400 hover:underline"
              onClick={() => setOpen(false)}
            >
              Открыть заявки на вывод
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
