"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { postLegalAccept, postLoginCaptcha, steamLoginUrl, turnstileSiteKey } from "@/lib/api";
import { STEAM_LOGIN_REDIRECT_EVENT } from "@/lib/steamLoginRedirect";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { fetchLegalDocsMeta, legalAcceptPayload, type LegalDocsMeta } from "@/lib/legalDocs";

const siteKey = turnstileSiteKey();

export function SteamLoginRedirectHost() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedAge, setAcceptedAge] = useState(false);
  const [legalMeta, setLegalMeta] = useState<LegalDocsMeta | null>(null);
  const [legalMetaErr, setLegalMetaErr] = useState<string | null>(null);

  useEffect(() => {
    function onReq() {
      setErr(null);
      setToken(null);
      setBusy(false);
      setAcceptedTerms(false);
      setAcceptedAge(false);
      setLegalMeta(null);
      setLegalMetaErr(null);
      setOpen(true);
    }
    window.addEventListener(STEAM_LOGIN_REDIRECT_EVENT, onReq);
    return () => window.removeEventListener(STEAM_LOGIN_REDIRECT_EVENT, onReq);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLegalMetaErr(null);
    (async () => {
      const m = await fetchLegalDocsMeta();
      if (cancelled) return;
      if (!m) {
        setLegalMeta(null);
        setLegalMetaErr("Не удалось загрузить документы. Проверьте соединение.");
        return;
      }
      setLegalMeta(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setToken(null);
    setErr(null);
    setBusy(false);
    setAcceptedTerms(false);
    setAcceptedAge(false);
    setLegalMeta(null);
    setLegalMetaErr(null);
  }, []);

  const proceed = useCallback(async () => {
    setBusy(true);
    setErr(null);
    if (!legalMeta) {
      setErr(legalMetaErr || "Нет данных документов.");
      setBusy(false);
      return;
    }
    if (!acceptedTerms || !acceptedAge) {
      setErr("Отметьте согласие с документами и подтвердите возраст 18+.");
      setBusy(false);
      return;
    }
    try {
      if (siteKey) {
        if (!token) {
          setErr("Пройдите проверку ниже.");
          setBusy(false);
          return;
        }
        const r = await postLoginCaptcha(token || "");
        if (!r.ok) {
          setErr(r.error || "Ошибка");
          setBusy(false);
          return;
        }
      }
      const la = await postLegalAccept(legalAcceptPayload(legalMeta));
      if (!la.ok) {
        setErr(la.error || "Не удалось зафиксировать согласие");
        setBusy(false);
        return;
      }
      window.location.href = steamLoginUrl();
    } catch {
      setErr("Нет связи с сервером");
      setBusy(false);
    }
  }, [acceptedAge, acceptedTerms, legalMeta, legalMetaErr, token]);

  if (!open) return null;

  const canContinue =
    Boolean(legalMeta) &&
    acceptedTerms &&
    acceptedAge &&
    (!siteKey || Boolean(token)) &&
    !busy;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="relative max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-cb-stroke/80 bg-zinc-950 p-6 shadow-2xl">
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 rounded-full border border-cb-stroke/70 bg-black/40 px-2.5 py-1 text-xs text-zinc-400 hover:bg-black/60"
          aria-label="Закрыть"
        >
          ✕
        </button>
        <h2 className="text-lg font-bold text-white">Вход через Steam</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Для новых аккаунтов нужно принять документы и подтвердить возраст. Уже зарегистрированным это не
          потребуется.
        </p>
        {legalMetaErr ? (
          <p className="mt-3 text-xs text-amber-200/90">{legalMetaErr}</p>
        ) : null}
        {siteKey ? (
          <div className="mt-4 flex min-h-[72px] items-center justify-center">
            <TurnstileWidget siteKey={siteKey} onToken={setToken} />
          </div>
        ) : null}
        <div className="mt-4 space-y-3 text-xs text-zinc-300">
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
              <Link href="/legal/privacy" className="text-cb-flame hover:underline" target="_blank">
                {legalMeta?.privacy.title || "Политику конфиденциальности"}
              </Link>{" "}
              и{" "}
              <Link href="/legal/cookies" className="text-cb-flame hover:underline" target="_blank">
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
        {err ? <p className="mt-3 text-sm text-red-300">{err}</p> : null}
        <button
          type="button"
          disabled={!canContinue}
          onClick={() => void proceed()}
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-red-700 to-cb-flame px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy ? "Проверяем…" : "Продолжить со Steam"}
        </button>
      </div>
    </div>
  );
}
