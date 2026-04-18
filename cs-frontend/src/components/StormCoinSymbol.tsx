"use client";

import { useId } from "react";

/**
 * Внутрішня валюта — storm-coin: червона заливка шестикутника, біла блискавка.
 */
export function StormCoinSymbol({
  className = "",
  title = "storm-coin",
}: {
  className?: string;
  title?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const gFace = `sc-f-${uid}`;
  const gRim = `sc-r-${uid}`;

  return (
    <svg
      viewBox="0 0 24 24"
      className={`inline-block h-[1.18em] w-[1.18em] max-h-[1.4em] max-w-[1.4em] shrink-0 align-[-0.14em] drop-shadow-[0_0_5px_rgba(255,49,49,0.4)] [vertical-align:middle] ${className}`}
      aria-hidden
      focusable="false"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={gFace} x1="28%" y1="10%" x2="72%" y2="90%">
          <stop offset="0%" stopColor="#ff6b6b" />
          <stop offset="45%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id={gRim} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fecaca" />
          <stop offset="40%" stopColor="#ff3131" />
          <stop offset="100%" stopColor="#450a0a" />
        </linearGradient>
      </defs>

      {/* ореол */}
      <path
        d="M12 2.85 19.02 7.1v9.8L12 21.15 4.98 16.9V7.1L12 2.85z"
        fill="none"
        stroke="#ff3131"
        strokeLinejoin="round"
        strokeOpacity={0.42}
        strokeWidth={2.35}
      />

      <path
        d="M12 2.85 19.02 7.1v9.8L12 21.15 4.98 16.9V7.1L12 2.85z"
        fill={`url(#${gFace})`}
        stroke={`url(#${gRim})`}
        strokeLinejoin="round"
        strokeWidth={1.1}
      />

      {/* блік на червоному тлі */}
      <ellipse cx="12" cy="7.6" fill="#ffffff" opacity={0.2} rx="4.2" ry="1.45" />

      {/* блискавка — біла */}
      <path
        d="M13.08 6.42 7.48 13.9h3.4L9.12 18.42 16.42 10h-3l-1.48-3.58z"
        fill="#450a0a"
        opacity={0.35}
        transform="translate(0.12 0.15)"
      />
      <path
        d="M12.9 6.1 7.4 13.72h3.36L9.02 18.22 16.32 9.82h-2.96l-1.52-3.72z"
        fill="#ffffff"
        stroke="#f8fafc"
        strokeLinejoin="round"
        strokeOpacity={0.9}
        strokeWidth={0.35}
      />
    </svg>
  );
}
