"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, getToken } from "@/lib/api";
import {
  diffWithdrawalsForNotifications,
  enrichCancelledDetailsFromMine,
  loadSnapState,
  loadStoredNotifications,
  mergeNewNotifications,
  saveStatusSnap,
  saveStoredNotifications,
  type PublicWithdrawalMineRow,
  type StoredWithdrawalNotification,
} from "@/lib/withdrawalNotifications";

const POLL_MS = 45_000;

function BellIcon({ className }: { className?: string }) {
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
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function kindAccent(kind: StoredWithdrawalNotification["kind"]): string {
  if (kind === "completed") return "text-emerald-400/95";
  if (kind === "cancelled") return "text-amber-400/95";
  return "text-red-400/90";
}

export function NavbarNotifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StoredWithdrawalNotification[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refreshList = useCallback(() => {
    setItems(loadStoredNotifications());
  }, []);

  const poll = useCallback(async () => {
    if (!getToken()) return;
    const r = await apiFetch<{ withdrawals: PublicWithdrawalMineRow[] }>("/api/withdrawals/mine");
    if (!r.ok || !Array.isArray(r.data?.withdrawals)) return;
    const { map: prev, neverSaved } = loadSnapState();
    const { nextSnap, newEvents } = diffWithdrawalsForNotifications(
      r.data.withdrawals,
      prev,
      neverSaved,
    );
    saveStatusSnap(nextSnap);
    const existing = loadStoredNotifications();
    let merged = mergeNewNotifications(existing, newEvents);
    merged = enrichCancelledDetailsFromMine(r.data.withdrawals, merged);
    if (JSON.stringify(merged) !== JSON.stringify(existing)) {
      saveStoredNotifications(merged);
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
    const onMineChanged = () => void poll();
    window.addEventListener("focus", onFocus);
    window.addEventListener("cd-withdrawals-mine-changed", onMineChanged);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("cd-withdrawals-mine-changed", onMineChanged);
    };
  }, [poll]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }
  }, [open]);

  const unread = useMemo(() => items.filter((x) => !x.read).length, [items]);

  function markAllRead() {
    const next = items.map((x) => ({ ...x, read: true }));
    saveStoredNotifications(next);
    setItems(next);
  }

  function clearAll() {
    saveStoredNotifications([]);
    setItems([]);
  }

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cb-stroke/90 bg-cb-panel/50 text-zinc-300 transition hover:border-cb-flame/40 hover:text-white focus-visible:outline focus-visible:ring-2 focus-visible:ring-cb-flame/45"
        aria-label="Уведомления"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <BellIcon className="h-[22px] w-[22px]" />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-cb-flame px-1 text-[10px] font-black leading-none text-white shadow-[0_0_12px_rgba(255,49,49,0.55)]">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-[70] mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-cb-stroke bg-zinc-950/98 shadow-2xl shadow-black/60 backdrop-blur-xl"
          role="dialog"
          aria-label="Уведомления о выводе"
        >
          <div className="flex items-center justify-between border-b border-cb-stroke/80 px-3 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Уведомления</p>
            <div className="flex gap-2">
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[10px] font-semibold uppercase tracking-wide text-cb-flame hover:underline"
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
                Здесь появятся сообщения о выводе скинов: успешная отправка, отмена с причиной и ошибки.
              </p>
            ) : (
              <ul className="divide-y divide-cb-stroke/50">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={`px-3 py-2.5 ${n.read ? "opacity-75" : "bg-red-950/15"}`}
                  >
                    <p className={`text-[11px] font-bold leading-snug ${kindAccent(n.kind)}`}>
                      {n.title || "Уведомление"}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-zinc-300">{n.body}</p>
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
          <div className="border-t border-cb-stroke/80 px-3 py-2">
            <Link
              href="/profile"
              className="block text-center text-[11px] font-semibold text-cb-flame hover:underline"
              onClick={() => setOpen(false)}
            >
              Профиль и заявки на вывод
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
