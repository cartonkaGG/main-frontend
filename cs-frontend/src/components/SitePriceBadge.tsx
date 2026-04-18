"use client";

import { RoundedZapIcon } from "@/components/icons/RoundedZapIcon";
import { formatRub } from "@/lib/money";

const pillBase =
  "inline-flex items-center bg-gradient-to-b from-red-500 to-[#b91c1c] font-mono font-bold tabular-nums tracking-tight text-white";

const shadowMd =
  "shadow-[0_6px_22px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)]";
const shadowSm =
  "shadow-[0_4px_14px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.15)]";

export function SitePriceBadge({
  value,
  size = "md",
  className = "",
  title,
}: {
  value: number | null | undefined;
  size?: "sm" | "md";
  className?: string;
  title?: string;
}) {
  const sizeCls =
    size === "sm"
      ? `gap-1 rounded-lg px-2 py-1 text-[10px] ${shadowSm} sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs`
      : `gap-1.5 rounded-lg px-4 py-2 text-sm ${shadowMd} sm:gap-2 sm:px-[1.125rem] sm:py-2.5 sm:text-[0.95rem]`;
  const iconCls =
    size === "sm"
      ? "h-[1.1em] w-[1.1em] max-h-[14px] max-w-[14px] shrink-0 text-white sm:max-h-4 sm:max-w-4"
      : "h-[1.05em] w-[1.05em] max-h-[19px] max-w-[19px] shrink-0 text-white";

  return (
    <span className={`${pillBase} ${sizeCls} ${className}`.trim()} title={title}>
      <span className="tabular-nums leading-none">{formatRub(value)}</span>
      <RoundedZapIcon className={iconCls} />
    </span>
  );
}
