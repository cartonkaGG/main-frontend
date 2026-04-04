"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiBase, apiFetch, clearToken, getToken } from "@/lib/api";
import { requestSteamLoginRedirect } from "@/lib/steamLoginRedirect";

type PublicBeta = {
  closedBeta: boolean;
};

/** Дублюйте CLOSED_BETA на фронті — інакше при збої API інтерфейс відкривав повний сайт. */
function envClosedBetaFlag(): boolean {
  const v = (process.env.NEXT_PUBLIC_CLOSED_BETA || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Спочатку NEXT_PUBLIC_API_URL, потім той самий origin (/api/...) — працює з BACKEND_PROXY_URL у next.config.
 */
async function fetchPublicClosedBeta(): Promise<boolean | null> {
  const urls: string[] = [`${apiBase}/api/beta/public-status`];
  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/$/, "");
    const abs = `${origin}/api/beta/public-status`;
    if (!urls.includes(abs)) urls.push(abs);
  }
  for (const url of urls) {
    try {
      const pr = await fetch(url, { credentials: "include" });
      if (!pr.ok) continue;
      const pub = (await pr.json()) as PublicBeta;
      return Boolean(pub.closedBeta);
    } catch {
      /* next url */
    }
  }
  return null;
}

type MeSession = {
  displayName: string;
  avatar: string;
  steamId?: string;
  closedBeta: boolean;
  betaStatus: string | null;
  hasFullAccess: boolean;
};

type GateView = "loading" | "site" | "beta" | "sessionErr";

function GateScrim({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#020204] text-zinc-100">{children}</div>
  );
}

export function ClosedBetaBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [view, setView] = useState<GateView>(() => (envClosedBetaFlag() ? "beta" : "loading"));
  const [session, setSession] = useState<MeSession | null>(null);
  const [applyNote, setApplyNote] = useState("");
  const [applyBusy, setApplyBusy] = useState(false);
  const [applyErr, setApplyErr] = useState<string | null>(null);
  /** Лише після mount: на SSR/localStorage немає — інакше гідратація не збігається з клієнтом із токеном */
  const [hasBrowserToken, setHasBrowserToken] = useState(false);

  const refresh = useCallback(async () => {
    setApplyErr(null);
    // Не скидати view у loading/beta на початку — інакше при кожній зміні pathname
    // повний екран «Загрузка» перекриває сайт (сильні лаги/микання).
    try {
      const on = await fetchPublicClosedBeta();
      if (on === null) {
        setSession(null);
        setView(envClosedBetaFlag() ? "beta" : "site");
        return;
      }
      if (!on) {
        setSession(null);
        setView("site");
        return;
      }
      const token = getToken();
      if (!token) {
        setSession(null);
        setView("beta");
        return;
      }
      const r = await apiFetch<MeSession>("/api/me/session");
      if (!r.ok) {
        if (r.status === 401) {
          clearToken();
          setSession(null);
          setView("beta");
          return;
        }
        setSession(null);
        setView("sessionErr");
        return;
      }
      const s = r.data!;
      setSession(s);
      setView(s.hasFullAccess ? "site" : "beta");
    } catch {
      setSession(null);
      setView(envClosedBetaFlag() ? "beta" : "site");
    }
  }, []);

  useEffect(() => {
    const syncToken = () => setHasBrowserToken(Boolean(getToken()));
    syncToken();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cd_token" || e.key === null) syncToken();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", syncToken);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", syncToken);
    };
  }, []);

  useEffect(() => {
    if (pathname?.startsWith("/auth/callback") || pathname?.startsWith("/user/")) return;
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    if (pathname?.startsWith("/auth/callback") || pathname?.startsWith("/user/")) {
      document.documentElement.removeAttribute("data-closed-beta-gate");
      return;
    }
    if (view === "site") {
      document.documentElement.removeAttribute("data-closed-beta-gate");
      return;
    }
    document.documentElement.setAttribute("data-closed-beta-gate", "");
    return () => {
      document.documentElement.removeAttribute("data-closed-beta-gate");
    };
  }, [pathname, view]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === "cd_token" &&
        !pathname?.startsWith("/auth/callback") &&
        !pathname?.startsWith("/user/")
      ) {
        void refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh, pathname]);

  if (pathname?.startsWith("/auth/callback") || pathname?.startsWith("/user/")) {
    return <>{children}</>;
  }

  if (view === "site") {
    return <>{children}</>;
  }

  if (view === "loading") {
    return (
      <GateScrim>
        <div className="flex flex-1 items-center justify-center text-zinc-500">Загрузка…</div>
      </GateScrim>
    );
  }

  if (view === "sessionErr" && hasBrowserToken) {
    return (
      <GateScrim>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center text-zinc-300">
          <p className="max-w-sm text-sm">Не удалось загрузить профиль. Проверьте связь с сервером.</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-xl border border-cb-stroke/80 bg-black/40 px-5 py-2.5 text-sm text-white transition hover:border-cb-flame/40"
          >
            Повторить
          </button>
          <button
            type="button"
            onClick={() => {
              clearToken();
              void refresh();
            }}
            className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-400 hover:underline"
          >
            Выйти
          </button>
        </div>
      </GateScrim>
    );
  }

  const status = (session?.betaStatus || "").toLowerCase();
  const isPending = status === "pending";

  async function submitApply() {
    setApplyErr(null);
    setApplyBusy(true);
    const r = await apiFetch<{ ok?: boolean }>("/api/beta/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: applyNote.trim() || undefined }),
    });
    setApplyBusy(false);
    if (!r.ok) {
      setApplyErr(r.error || "Не удалось отправить");
      return;
    }
    setApplyNote("");
    void refresh();
  }

  return (
    <GateScrim>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-8 flex items-center gap-3">
          <Image src="/logo.svg" alt="" width={40} height={40} className="opacity-90" />
          <span className="text-xl font-bold tracking-tight text-white">StormBattle</span>
        </div>
        <div className="w-full max-w-md rounded-2xl border border-cb-stroke/80 bg-cb-panel/40 p-6 shadow-[inset_0_1px_0_rgba(255,49,49,0.06)] backdrop-blur-sm">
          <h1 className="mb-2 text-lg font-bold text-white">Закрытая бета</h1>
          <p className="mb-6 text-sm leading-relaxed text-zinc-400">
            Кейсы и остальной сайт скрыты. Доступ только после одобрения заявки. Войдите через Steam — затем
            отправьте заявку; без входа заявку подать нельзя.
          </p>

          {!hasBrowserToken ? (
            <button
              type="button"
              onClick={() => requestSteamLoginRedirect()}
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-900 to-cb-flame py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[0_8px_28px_rgba(255,49,49,0.25)] transition hover:brightness-110"
            >
              Войти через Steam
            </button>
          ) : isPending ? (
            <div className="space-y-4 text-left">
              <p className="text-sm text-zinc-300">
                Заявка отправлена. Ожидайте решения администратора — после одобрения обновите страницу.
              </p>
              {session?.displayName ? (
                <p className="text-xs text-zinc-500">
                  Аккаунт: <span className="text-zinc-400">{session.displayName}</span>
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void refresh()}
                className="w-full rounded-xl border border-cb-stroke/80 bg-black/40 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-cb-flame/40"
              >
                Проверить статус
              </button>
              <button
                type="button"
                onClick={() => {
                  clearToken();
                  void refresh();
                }}
                className="w-full text-xs text-zinc-500 underline-offset-2 hover:text-zinc-400 hover:underline"
              >
                Выйти из аккаунта
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-left">
              {status === "rejected" ? (
                <p className="text-sm text-amber-200/90">
                  Предыдущая заявка отклонена. Вы можете отправить новую.
                </p>
              ) : null}
              {session?.displayName ? (
                <p className="text-xs text-zinc-500">
                  Вы вошли как <span className="text-zinc-400">{session.displayName}</span>
                </p>
              ) : null}
              <label className="block text-xs font-medium text-zinc-500">
                Комментарий для админа (необязательно)
                <textarea
                  value={applyNote}
                  onChange={(e) => setApplyNote(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="mt-1.5 w-full resize-none rounded-lg border border-cb-stroke/70 bg-black/50 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-cb-flame/50 focus:outline-none"
                  placeholder="Например, откуда узнали о проекте"
                />
              </label>
              {applyErr ? <p className="text-sm text-red-300">{applyErr}</p> : null}
              <button
                type="button"
                disabled={applyBusy}
                onClick={() => void submitApply()}
                className="w-full rounded-xl bg-gradient-to-r from-red-900 to-cb-flame py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[0_8px_28px_rgba(255,49,49,0.25)] transition hover:brightness-110 disabled:opacity-45"
              >
                {applyBusy ? "Отправка…" : "Отправить заявку на бета-доступ"}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearToken();
                  void refresh();
                }}
                className="w-full text-xs text-zinc-500 underline-offset-2 hover:text-zinc-400 hover:underline"
              >
                Выйти и войти другим Steam
              </button>
            </div>
          )}
        </div>
      </div>
    </GateScrim>
  );
}
