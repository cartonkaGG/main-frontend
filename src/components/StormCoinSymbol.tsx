"use client";

/**
 * Ігрова валюта storm-coin — червона блискавка (як у балансі / референсі).
 */
export function StormCoinSymbol({
  className = "",
  title = "storm-coin",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block h-[1.18em] w-[1.18em] max-h-[1.4em] max-w-[1.4em] shrink-0 align-[-0.14em] drop-shadow-[0_0_6px_rgba(255,49,49,0.5)] [vertical-align:middle] ${className}`}
      aria-hidden
      focusable="false"
    >
      <title>{title}</title>
      <path
        fill="#ff3131"
        stroke="#b91c1c"
        strokeWidth={0.35}
        strokeLinejoin="round"
        strokeLinecap="round"
        paintOrder="stroke fill"
        d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
      />
    </svg>
  );
}
