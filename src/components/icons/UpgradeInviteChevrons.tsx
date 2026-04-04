"use client";

/**
 * Три шеврони для порожніх слотів апгрейду: округлі кінці обводки; колір і glow задає `className`.
 * Анімація — класи `ug-stake-invite-chevron*` / `ug-target-invite-chevron*` у globals.css.
 */
function ChevronDownGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3 4.5L12 11.5L21 4.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ChevronUpGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3 9.5L12 2.5L21 9.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function UpgradeInviteChevrons({
  variant,
  className = "",
}: {
  /** stake: ▼ + анімація вниз; target: ▲ + анімація вгору */
  variant: "stake" | "target";
  className?: string;
}) {
  const base =
    variant === "stake" ? "ug-stake-invite-chevron" : "ug-target-invite-chevron";
  const Glyph = variant === "stake" ? ChevronDownGlyph : ChevronUpGlyph;
  const iconCls = "h-[15px] w-[30px] shrink-0 sm:h-[18px] sm:w-9";

  return (
    <div
      className={`flex flex-col items-center gap-1.5 sm:gap-2 ${className}`.trim()}
      aria-hidden
    >
      <span className={`${base} ${base}--1 inline-flex`}>
        <Glyph className={iconCls} />
      </span>
      <span className={`${base} ${base}--2 inline-flex`}>
        <Glyph className={iconCls} />
      </span>
      <span className={`${base} ${base}--3 inline-flex`}>
        <Glyph className={iconCls} />
      </span>
    </div>
  );
}
