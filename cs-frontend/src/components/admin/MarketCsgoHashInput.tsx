"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatSiteAmount } from "@/lib/money";

export type MarketSearchHit = { marketHashName: string; priceRub: number };

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  inputClassName?: string;
  /** Мінімальна довжина запиту для пошуку */
  minQueryLength?: number;
  /** Підказка під полем (у таблиці виводів краще вимкнути) */
  showHint?: boolean;
};

export function MarketCsgoHashInput({
  value,
  onChange,
  placeholder = "AK-47 | Redline (Field-Tested)",
  inputClassName = "",
  minQueryLength = 2,
  showHint = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<MarketSearchHit[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);
  const reqIdRef = useRef(0);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const fetchHits = useCallback(
    (q: string) => {
      if (debounceRef.current !== undefined) window.clearTimeout(debounceRef.current);
      const trimmed = q.trim();
      if (trimmed.length < minQueryLength) {
        setHits([]);
        setLoading(false);
        return;
      }
      debounceRef.current = window.setTimeout(async () => {
        const myId = ++reqIdRef.current;
        setHits([]);
        setLoading(true);
        const r = await apiFetch<{ items: MarketSearchHit[] }>(
          `/api/admin/market-search?q=${encodeURIComponent(trimmed)}`,
        );
        if (myId !== reqIdRef.current) return;
        setLoading(false);
        if (r.ok && Array.isArray(r.data?.items)) setHits(r.data!.items);
        else setHits([]);
      }, 300);
    },
    [minQueryLength],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current !== undefined) window.clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          onChange(e.target.value);
          fetchHits(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          if (value.trim().length >= minQueryLength) fetchHits(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className={inputClassName}
      />
      {open && value.trim().length >= minQueryLength ? (
        <ul
          className="absolute z-[80] mt-1 max-h-60 w-full min-w-[min(100%,20rem)] overflow-auto rounded-lg border border-cb-stroke/90 bg-[#0d1117] py-1 shadow-2xl shadow-black/50"
          role="listbox"
        >
          {loading ? (
            <li className="px-3 py-2 text-xs text-zinc-500">Поиск в прайсе…</li>
          ) : null}
          {!loading && hits.length === 0 ? (
            <li className="px-3 py-2 text-xs text-zinc-500">Ничего не найдено</li>
          ) : null}
          {hits.map((h) => (
            <li
              key={h.marketHashName}
              role="option"
              aria-selected={value.trim() === h.marketHashName}
            >
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs transition hover:bg-white/5"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(h.marketHashName);
                  setOpen(false);
                  setHits([]);
                }}
              >
                <span className="min-w-0 flex-1 break-words font-mono leading-snug text-zinc-200">
                  {h.marketHashName}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-emerald-400/95">
                  {formatSiteAmount(h.priceRub)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {showHint ? (
        <p className="mt-1 text-[9px] text-zinc-600">
          Введите 2+ символа — подсказки из прайса market.csgo (несколько слов через пробел). Цены ориентировочные.
        </p>
      ) : null}
    </div>
  );
}
