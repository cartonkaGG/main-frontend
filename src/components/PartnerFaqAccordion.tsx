"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { PartnerLevelHudOrb } from "@/components/PartnerLevelHudOrb";
import { StormCoinSymbol } from "@/components/StormCoinSymbol";

type FaqRow = { id: string; question: string; answer: string };

/**
 * Після «150» у типовій фразі про мінімальне поповнення — та сама іконка, що в балансі (`StormCoinSymbol`).
 * У тексті з адмінки «от» — кирилиця; також «150» перед комою/крапкою або перед наступним словом.
 * Явно: `:stormcoin:` у будь-якому місці відповіді.
 */
const CYR_OT = "\u043e\u0442"; // «от»
const AFTER_150_RE = new RegExp(
  `(${CYR_OT}\\s)150(\\s*[,.]|\\s+(?=[\\u0410-\\u044F\\u0401\\u0451A-Za-zЁё]))`,
  "gi",
);

function injectStormCoinAfterOt150(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(AFTER_150_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    out.push(m[1], "150");
    out.push(
      <StormCoinSymbol
        key={`${keyPrefix}-sc150-${n}`}
        className="mx-0.5 inline-block h-[1.15em] w-[1.15em] max-h-[1.25em] max-w-[1.25em] align-[-0.14em] drop-shadow-[0_0_6px_rgba(255,49,49,0.35)]"
        title="storm-coin"
      />,
    );
    out.push(m[2]);
    last = start + m[0].length;
    n += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderPartnerFaqAnswerBody(text: string, rowKey: string): ReactNode {
  const chunks = text.split(":stormcoin:");
  return (
    <>
      {chunks.map((chunk, i) => (
        <Fragment key={`${rowKey}-c${i}`}>
          {injectStormCoinAfterOt150(chunk, `${rowKey}-${i}`)}
          {i < chunks.length - 1 ? (
            <StormCoinSymbol
              key={`${rowKey}-scx-${i}`}
              className="mx-0.5 inline-block h-[1.15em] w-[1.15em] max-h-[1.25em] max-w-[1.25em] align-[-0.14em] drop-shadow-[0_0_6px_rgba(255,49,49,0.35)]"
              title="storm-coin"
            />
          ) : null}
        </Fragment>
      ))}
    </>
  );
}

function PlusMinusIcon({ open }: { open: boolean }) {
  return (
    <span className="relative flex h-[15px] w-[15px] items-center justify-center" aria-hidden>
      <span className="absolute h-[3px] w-[15px] rounded-full bg-current" />
      {!open ? <span className="absolute h-[15px] w-[3px] rounded-full bg-current" /> : null}
    </span>
  );
}

export function PartnerFaqAccordion() {
  const baseId = useId();
  const [items, setItems] = useState<FaqRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** Какой подпункт раскрыт; повторный клик по той же строке закрывает. */
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const r = await apiFetch<{ items: FaqRow[] }>("/api/partner/faq");
    setLoading(false);
    if (!r.ok) {
      if (r.status === 404) {
        setErr(
          "Ошибка 404: маршрут /api/partner/faq не найден. Обычно фронт ходит не на бекенд: проверьте .env — " +
            "NEXT_PUBLIC_API_URL=http://127.0.0.1:4000, либо BACKEND_PROXY_URL=http://127.0.0.1:4000 и NEXT_PUBLIC_API_URL=http://localhost:3000 (см. stormbattle/frontend/.env.example). " +
            "Убедитесь, что API запущен и после обновления кода перезапущен."
        );
      } else if (r.status === 503) {
        setErr(r.error || "Справка временно недоступна (нет MongoDB или сервер не готов).");
      } else if (r.status === 403) {
        setErr(r.error || "Нет доступа к разделу партнёра.");
      } else if (r.status === 0) {
        setErr("Нет связи с API — проверьте, что бекенд запущен на порту из NEXT_PUBLIC_API_URL.");
      } else {
        setErr(r.error || "Не удалось загрузить");
      }
      setItems([]);
      return;
    }
    setItems(r.data?.items ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="rounded-3xl border border-white/[0.06] bg-[#050505] p-[1.875rem] sm:p-[2.25rem]">
      <div className="mb-9 space-y-6">
        <div>
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Уровни</p>
          <div className="flex min-w-0 items-end justify-center gap-2 sm:gap-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <PartnerLevelHudOrb key={n} level={n} />
            ))}
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Ответы на вопросы</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-[1.125rem] py-[3.75rem] text-base text-zinc-500">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
          Загрузка…
        </div>
      ) : err ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-950/20 px-6 py-4 text-base leading-relaxed text-red-300">
          {err}
        </p>
      ) : !items?.length ? (
        <p className="rounded-2xl border border-dashed border-white/[0.1] bg-zinc-950/80 px-6 py-12 text-center text-base leading-relaxed text-zinc-500">
          Пока нет подпунктов. Администратор может добавить их в админ-панели: «F.A.Q партнеров».
        </p>
      ) : (
        <ul className="flex flex-col gap-4 sm:gap-[1.125rem]" role="list">
          {items.map((row) => {
            const open = openId === row.id;
            const panelId = `${baseId}-panel-${row.id}`;
            const headerId = `${baseId}-header-${row.id}`;
            return (
              <li key={row.id} className="overflow-hidden rounded-2xl bg-[#1c1c1c] ring-1 ring-white/[0.06]">
                <button
                  type="button"
                  id={headerId}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenId((prev) => (prev === row.id ? null : row.id))}
                  className="flex w-full items-center justify-between gap-[1.125rem] px-6 py-5 text-left transition hover:bg-white/[0.03] sm:px-[1.875rem] sm:py-6"
                >
                  <span className="min-w-0 flex-1 text-[22px] font-bold leading-snug text-white">
                    {row.question}
                  </span>
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-zinc-200 transition ${
                      open
                        ? "border-zinc-500 bg-zinc-800/90"
                        : "border-zinc-600 bg-zinc-900/80 hover:border-zinc-500"
                    }`}
                    aria-hidden
                  >
                    <PlusMinusIcon open={open} />
                  </span>
                </button>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="border-t border-white/[0.06] bg-black/25 px-6 pb-6 pt-4 sm:px-[1.875rem] sm:pb-[1.875rem] sm:pt-5">
                      <p className="whitespace-pre-wrap text-base leading-relaxed text-zinc-400 sm:text-[17px] sm:leading-relaxed">
                        {renderPartnerFaqAnswerBody(row.answer, row.id)}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-12 text-center text-sm text-zinc-600 sm:text-[15px]">
        Нужна персональная помощь?{" "}
        <Link
          href="/support"
          className="font-medium text-cb-flame/95 underline-offset-[3px] hover:underline"
        >
          Центр поддержки
        </Link>
      </p>
    </div>
  );
}
