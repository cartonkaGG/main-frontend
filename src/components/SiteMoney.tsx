"use client";

import { StormCoinSymbol } from "@/components/StormCoinSymbol";
import { formatRub, formatRubSpaced } from "@/lib/money";

export function SiteMoney({
  value,
  spaced,
  className = "",
  iconClassName,
}: {
  value: number | null | undefined;
  spaced?: boolean;
  className?: string;
  /** За замовч. компактна іконка ~1em. */
  iconClassName?: string;
}) {
  const s = spaced ? formatRubSpaced(value) : formatRub(value);
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`.trim()}>
      <span className="tabular-nums">{s}</span>
      <StormCoinSymbol
        className={iconClassName ?? "h-[1em] w-[1em] max-h-[1.15em] max-w-[1.15em] shrink-0"}
      />
    </span>
  );
}
