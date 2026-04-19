"use client";

import { StormCoinSymbol } from "@/components/StormCoinSymbol";
import { formatRub, formatRubSpaced } from "@/lib/money";

export function SiteMoney({
  value,
  spaced,
  className = "",
  iconClassName,
  hideIcon,
}: {
  value: number | null | undefined;
  spaced?: boolean;
  className?: string;
  /** Додаткові класи для іконки storm-coin (розмір, відступи); заливка всередині SVG. */
  iconClassName?: string;
  /** Без іконки storm-coin (наприклад, якщо поруч своя іконка гаманця). */
  hideIcon?: boolean;
}) {
  const s = spaced ? formatRubSpaced(value) : formatRub(value);
  return (
    <span className={`inline-flex items-center gap-1 font-mono ${className}`.trim()}>
      <span className="tabular-nums">{s}</span>
      {hideIcon ? null : (
        <StormCoinSymbol
          className={
            iconClassName ??
            "h-[1em] w-[1em] max-h-[1.2em] max-w-[1.2em] shrink-0 align-[-0.12em]"
          }
          title="storm-coin"
        />
      )}
    </span>
  );
}
