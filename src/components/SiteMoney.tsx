"use client";

import { RoundedZapIcon } from "@/components/icons/RoundedZapIcon";
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
  /** За замовч. компактна іконка ~1em, колір успадковує текст (`text-current`). */
  iconClassName?: string;
}) {
  const s = spaced ? formatRubSpaced(value) : formatRub(value);
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono ${className}`.trim()}>
      <span className="tabular-nums">{s}</span>
      <RoundedZapIcon
        className={
          iconClassName ??
          "h-[1em] w-[1em] max-h-[1.15em] max-w-[1.15em] shrink-0 text-current opacity-95"
        }
      />
    </span>
  );
}
