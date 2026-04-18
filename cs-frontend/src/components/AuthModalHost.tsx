"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { postLegalAccept, postLoginCaptcha, steamLoginUrl, turnstileSiteKey } from "@/lib/api";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { fetchLegalDocsMeta, legalAcceptPayload, type LegalDocsMeta } from "@/lib/legalDocs";

type CdAuthModalEvent = CustomEvent<{ nextUrl?: string | null }>;

const tsSiteKey = turnstileSiteKey();

export function AuthModalHost() {
  const [open, setOpen] = useState(false);
  const [nextUrl, setNextUrl] = useState<string>("/");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedAge, setAcceptedAge] = useState(false);
  const [legalMeta, setLegalMeta] = useState<LegalDocsMeta | null>(null);
  const [legalMetaErr, setLegalMetaErr] = useState<string | null>(null);
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [steamBusy, setSteamBusy] = useState(false);
  const [capErr, setCapErr] = useState<string | null>(null);

  const loginHref = useMemo(() => steamLoginUrl(), []);

  useEffect(() => {
    function onRequest(e: Event) {
      if (typeof document !== "undefined" && document.documentElement.hasAttribute("data-closed-beta-gate")) {
        return;
      }
      const ce = e as CdAuthModalEvent;
      const detailNext = ce.detail?.nextUrl;
      const url =
        (typeof detailNext === "string" && detailNext) ||
        `${window.location.pathname}${window.location.search}`;

      setNextUrl(url);
      setAcceptedTerms(false);
      setAcceptedAge(false);
      setLegalMeta(null);
      setLegalMetaErr(null);
      setTsToken(null);
      setCapErr(null);
      setSteamBusy(false);
      setOpen(true);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") {
        close();
      }
    }

    window.addEventListener("cd-auth-modal", onRequest as EventListener);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("cd-auth-modal", onRequest as EventListener);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLegalMetaErr(null);
    (async () => {
      const m = await fetchLegalDocsMeta();
      if (cancelled) return;
      if (!m) {
        setLegalMeta(null);
        setLegalMetaErr("Не удалось загрузить тексты документов. Проверьте соединение.");
        return;
      }
      setLegalMeta(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.localStorage.setItem("cd_next", nextUrl);
  }, [open, nextUrl]);

  function close() {
    setOpen(false);
    setAcceptedTerms(false);
    setAcceptedAge(false);
    setLegalMeta(null);
    setLegalMetaErr(null);
    setTsToken(null);
    setCapErr(null);
    setSteamBusy(false);
    window.localStorage.removeItem("cd_next");
  }

  async function handleSteamLogin() {
    setCapErr(null);
    if (!legalMeta) {
      setCapErr(legalMetaErr || "Загрузите страницу и попробуйте снова.");
      return;
    }
    if (tsSiteKey && !tsToken) {
      setCapErr("Пройдите проверку ниже.");
      return;
    }
    setSteamBusy(true);
    if (tsSiteKey) {
      const r = await postLoginCaptcha(tsToken || "");
      if (!r.ok) {
        setCapErr(r.error || "Ошибка проверки");
        setSteamBusy(false);
        return;
      }
    }
    const la = await postLegalAccept(legalAcceptPayload(legalMeta));
    if (!la.ok) {
      setCapErr(la.error || "Не удалось зафиксировать согласие");
      setSteamBusy(false);
      return;
    }
    window.localStorage.setItem("cd_next", nextUrl);
    window.location.href = loginHref;
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // Закрываем только если кликнули по подложке.
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-cb-stroke/80 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black shadow-2xl">
        <button
          type="button"
          onClick={close}
          onMouseDown={(e) => {
            e.stopPropagation();
            close();
          }}
          className="absolute right-3 top-3 z-10 cursor-pointer rounded-full border border-cb-stroke/70 bg-black/30 px-3 py-1 text-xs text-zinc-300 hover:bg-black/50"
          aria-label="Закрыть"
        >
          X
        </button>

        <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
          <div className="p-8 md:p-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cb-flame/15 ring-1 ring-cb-flame/30">
                <span className="text-lg font-black text-cb-flame/90">CD</span>
              </div>
              <div className="leading-tight">
                <p className="text-xl font-black text-white">StormBattle</p>
                <p className="text-xs font-semibold text-zinc-400">Вход через Steam</p>
              </div>
            </div>

            <p className="mt-5 text-sm text-zinc-400">
              Присоединяйтесь, чтобы открыть кейс и получить предметы. Нужен вход через Steam.
            </p>

            {tsSiteKey ? (
              <div className="mt-4 flex min-h-[72px] items-center justify-center">
                <TurnstileWidget siteKey={tsSiteKey} onToken={setTsToken} />
              </div>
            ) : null}
            {legalMetaErr ? (
              <p className="mt-2 text-center text-xs text-amber-200/90">{legalMetaErr}</p>
            ) : null}
            {capErr ? <p className="mt-2 text-center text-xs text-red-300">{capErr}</p> : null}

            <div className="mt-6">
              <button
                type="button"
                onClick={() => void handleSteamLogin()}
                disabled={
                  !legalMeta ||
                  !(acceptedTerms && acceptedAge) ||
                  steamBusy ||
                  (Boolean(tsSiteKey) && !tsToken)
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-cb-flame px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span aria-hidden>STEAM</span>{" "}
                {steamBusy ? "Проверяем…" : "ВОЙТИ ЧЕРЕЗ STEAM"}
              </button>
            </div>

            <div className="mt-4 text-center text-xs text-zinc-500">
              Или войдите через социальную сеть
            </div>
            <div className="mt-3 flex items-center justify-start gap-3">
              <button
                type="button"
                disabled
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-cb-stroke/70 bg-black/20 text-sm text-zinc-500 opacity-60"
                aria-label="Google"
              >
                G
              </button>
              <button
                type="button"
                disabled
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-cb-stroke/70 bg-black/20 text-sm text-zinc-500 opacity-60"
                aria-label="Telegram"
              >
                TG
              </button>
            </div>

            <div className="mt-5 space-y-3 text-xs text-zinc-300">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Я принимаю{" "}
                  <Link href="/legal/terms" className="text-cb-flame hover:underline" target="_blank">
                    {legalMeta?.terms.title || "Пользовательское соглашение"}
                  </Link>
                  ,{" "}
                  <Link
                    href="/legal/privacy"
                    className="text-cb-flame hover:underline"
                    target="_blank"
                  >
                    {legalMeta?.privacy.title || "Политику конфиденциальности"}
                  </Link>{" "}
                  и{" "}
                  <Link
                    href="/legal/cookies"
                    className="text-cb-flame hover:underline"
                    target="_blank"
                  >
                    {legalMeta?.cookies.title || "Политику использования Cookie"}
                  </Link>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptedAge}
                  onChange={(e) => setAcceptedAge(e.target.checked)}
                  className="mt-0.5"
                />
                <span>Мне 18 или более лет</span>
              </label>
            </div>
          </div>

          <div className="relative hidden md:block">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-90"
              style={{
                backgroundImage:
                  "url('/logo.svg')", // Placeholder. You can replace this with an auth banner image.
              }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="relative flex h-full flex-col items-center justify-center p-10 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-cb-flame/90">
                Премиум-доступ
              </p>
              <p className="mt-4 text-base font-semibold text-white">
                Открой кейс после входа через Steam
              </p>
              <p className="mt-3 max-w-[280px] text-sm text-zinc-400">
                Сессия не будет сорвана: после логина вы вернётесь туда, где пробовали открыть кейс.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

