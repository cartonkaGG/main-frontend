"use client";

import type { ReactNode } from "react";

/**
 * Неонова «протокіль»: пунктирне зовнішнє кільце + дві товсті дуги зліва/справа, як на референсі.
 */
export function CaseNeonRingFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(92vw,248px)] shrink-0 overflow-visible sm:max-w-[300px] md:max-w-[328px]">
      <svg
        className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
        viewBox="0 0 100 100"
        aria-hidden
      >
        <defs>
          <filter
            id="cb-neon-soft"
            x="-60%"
            y="-60%"
            width="220%"
            height="220%"
          >
            <feGaussianBlur stdDeviation="0.45" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter
            id="cb-neon-strong"
            x="-80%"
            y="-80%"
            width="260%"
            height="260%"
          >
            <feGaussianBlur stdDeviation="1.15" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Дубль зовнішнього кільця для сильнішого bloom */}
        <g className="cb-case-neon-outer">
          <circle
            cx="50"
            cy="50"
            r="47.5"
            fill="none"
            stroke="rgba(255,60,60,0.35)"
            strokeWidth="0.9"
            strokeDasharray="0.35 1.15"
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="50"
            r="47.5"
            fill="none"
            stroke="#ff3b3b"
            strokeWidth="0.55"
            strokeDasharray="0.35 1.15"
            strokeLinecap="round"
            filter="url(#cb-neon-soft)"
          />
        </g>

        {/* Товсті дуги ліворуч і праворуч, обернення в зворотний бік */}
        <g className="cb-case-neon-arcs" filter="url(#cb-neon-strong)">
          <path
            d="M 20.31 79.69 A 42 42 0 0 1 20.31 20.31"
            fill="none"
            stroke="#ff4d4d"
            strokeWidth="1.85"
            strokeLinecap="round"
          />
          <path
            d="M 79.69 20.31 A 42 42 0 0 1 79.69 79.69"
            fill="none"
            stroke="#ff4d4d"
            strokeWidth="1.85"
            strokeLinecap="round"
          />
        </g>
      </svg>

      <div className="absolute inset-[11%] z-[1] overflow-visible bg-transparent">
        {children}
      </div>
    </div>
  );
}
