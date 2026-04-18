"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { postMeAcceptLegal } from "@/lib/api";
import { fetchLegalDocsMeta, legalAcceptPayload, type LegalDocsMeta } from "@/lib/legalDocs";

type Props = {
  open: boolean;
  onCompleted: () => void | Promise<void>;
};

/**
 * Блокирующее окно для аккаунтов без записи legalAcceptance (старые пользователи / память без Mongo).
 */
export function LegalAcceptanceRequiredModal({ open, onCompleted }: Props) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedAge, setAcceptedAge] = useState(false);
  const [legalMeta, setLegalMeta] = useState<LegalDocsMeta | null>(null);
  const [legalMetaErr, setLegalMetaErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAcceptedTerms(false);
    setAcceptedAge(false);
    setLegalMeta(null);
    setLegalMetaErr(null);
    setErr(null);
    setBusy(false);
    let cancelled = false;
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

  async function submit() {
    setErr(null);
    if (!legalMeta) {
      setErr(legalMetaErr || "Обновите страницу и попробуйте снова.");
      return;
    }
    if (!(acceptedTerms && acceptedAge)) return;
    setBusy(true);
    const r = await postMeAcceptLegal(legalAcceptPayload(legalMeta));
    setBusy(false);
    if (!r.ok) {
      setErr(r.error || "Не удалось сохранить согласие");
      return;
    }
    await onCompleted();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[205] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-reaccept-title"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-cb-stroke/80 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black shadow-2xl">
        <div className="p-8 md:p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cb-flame/15 ring-1 ring-cb-flame/30">
              <span className="text-lg font-black text-cb-flame/90">CD</span>
            </div>
            <div className="leading-tight">
              <p id="legal-reaccept-title" className="text-xl font-black text-white">
                Подтверждение согласия
              </p>
              <p className="text-xs font-semibold text-zinc-400">StormBattle</p>
            </div>
          </div>

          <p className="mt-5 text-sm text-zinc-400">
            Для вашей учётной записи ещё не сохранено согласие с юридическими документами. Отметьте все пункты
            ниже, чтобы продолжить пользоваться сайтом.
          </p>

          {legalMetaErr ? (
            <p className="mt-3 text-center text-xs text-amber-200/90">{legalMetaErr}</p>
          ) : null}
          {err ? <p className="mt-3 text-center text-xs text-red-300">{err}</p> : null}

          <div className="mt-6 space-y-3 text-xs text-zinc-300">
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

          <div className="mt-8">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!legalMeta || !(acceptedTerms && acceptedAge) || busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-cb-flame px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? "Сохраняем…" : "Подтвердить согласие"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
