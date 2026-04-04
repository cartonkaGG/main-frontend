"use client";

import { useCallback, useEffect, useState } from "react";
import { postLoginCaptcha, steamLoginUrl, turnstileSiteKey } from "@/lib/api";
import { STEAM_LOGIN_REDIRECT_EVENT } from "@/lib/steamLoginRedirect";
import { TurnstileWidget } from "@/components/TurnstileWidget";

const siteKey = turnstileSiteKey();

export function SteamLoginRedirectHost() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    function onReq() {
      if (!siteKey) {
        window.location.href = steamLoginUrl();
        return;
      }
      setErr(null);
      setToken(null);
      setOpen(true);
    }
    window.addEventListener(STEAM_LOGIN_REDIRECT_EVENT, onReq);
    return () => window.removeEventListener(STEAM_LOGIN_REDIRECT_EVENT, onReq);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setToken(null);
    setErr(null);
    setBusy(false);
  }, []);

  const proceed = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await postLoginCaptcha(token || "");
      if (!r.ok) {
        setErr(r.error || "Ошибка");
        setBusy(false);
        return;
      }
      window.location.href = steamLoginUrl();
    } catch {
      setErr("Нет связи с сервером");
      setBusy(false);
    }
  }, [token]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-cb-stroke/80 bg-zinc-950 p-6 shadow-2xl">
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 rounded-full border border-cb-stroke/70 bg-black/40 px-2.5 py-1 text-xs text-zinc-400 hover:bg-black/60"
          aria-label="Закрыть"
        >
          ✕
        </button>
        <h2 className="text-lg font-bold text-white">Проверка перед входом</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Пройдите короткую проверку, затем откроется вход через Steam.
        </p>
        {siteKey ? (
          <div className="mt-4 flex min-h-[72px] items-center justify-center">
            <TurnstileWidget siteKey={siteKey} onToken={setToken} />
          </div>
        ) : null}
        {err ? <p className="mt-3 text-sm text-red-300">{err}</p> : null}
        <button
          type="button"
          disabled={busy || !token}
          onClick={() => void proceed()}
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-700 to-cb-flame px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy ? "Проверяем…" : "Продолжить со Steam"}
        </button>
      </div>
    </div>
  );
}
