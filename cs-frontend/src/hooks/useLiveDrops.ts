"use client";

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { apiBase, apiFetch } from "@/lib/api";

export type LiveDrop = {
  id: string;
  user: string;
  /** Для перехода в публичный профиль; в старых записях буфера может отсутствовать */
  steamId?: string | null;
  item: string;
  rarity: string;
  caseName: string;
  image: string | null;
  at: number;
  /** Нет в старых записях буфера — считаем как кейс */
  source?: "case" | "upgrade";
};

const MAX_UI = 100;

export function useLiveDrops() {
  const [drops, setDrops] = useState<LiveDrop[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    (async () => {
      const r = await apiFetch<{ drops: LiveDrop[] }>("/api/live-drops");
      if (cancelled) return;
      if (r.ok && r.data?.drops) setDrops(r.data.drops.slice(0, MAX_UI));

      const { io } = await import("socket.io-client");
      if (cancelled) return;
      const s = io(apiBase, {
        transports: ["websocket", "polling"],
        autoConnect: true,
      });
      socketRef.current = s;

      function authSupportSocket() {
        try {
          const token = localStorage.getItem("cd_token");
          if (token) s.emit("support-notify-auth", { token });
        } catch {
          /* ignore */
        }
      }
      s.on("connect", authSupportSocket);
      authSupportSocket();

      s.on("support-reply", (payload: { ticketId: string; subject?: string }) => {
        if (cancelled || typeof window === "undefined") return;
        window.dispatchEvent(
          new CustomEvent("cd-support-reply", {
            detail: {
              ticketId: String(payload?.ticketId || ""),
              subject: String(payload?.subject || ""),
            },
          }),
        );
      });

      s.on("live-drop", (d: LiveDrop) => {
        if (cancelled) return;
        // Показ у лайв-стрічці приблизно через 12 с після події.
        const delayMs = 12000 + Math.floor(Math.random() * 400);
        const t = setTimeout(() => {
          if (cancelled) return;
          setDrops((prev) => [d, ...prev].slice(0, MAX_UI));
        }, delayMs);
        timeouts.push(t);
      });
      s.on("cases-updated", () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cd-cases-updated"));
        }
      });
      s.on("promos-updated", () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cd-promos-updated"));
        }
      });
    })();

    return () => {
      cancelled = true;
      timeouts.forEach((t) => clearTimeout(t));
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  return drops;
}
