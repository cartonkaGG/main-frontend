type Props = { className?: string };

/** Ящик + «монети» — вывод (в наших оранжево-янтарных тонах) */
export function PublicWithdrawCrateDecor({ className = "" }: Props) {
  return (
    <div
      className={`pointer-events-none relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center sm:h-[5.25rem] sm:w-[5.25rem] ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 88 88" className="h-full w-full overflow-visible text-orange-500/85">
        <defs>
          <linearGradient id="pp-crate-w" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(234 88 12)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(120 53 15)" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <g className="motion-reduce:animate-none animate-pp-stat-bob origin-center" style={{ transformBox: "fill-box" }}>
          <path
            d="M44 18L18 32v24l26 14 26-14V32L44 18z"
            fill="url(#pp-crate-w)"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
            opacity="0.9"
          />
          <path d="M18 32l26 14 26-14M44 46v20" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
        </g>
        <circle
          className="motion-reduce:animate-none animate-pp-stat-bob fill-amber-400/90"
          style={{ animationDelay: "0.15s" }}
          cx="58"
          cy="28"
          r="5"
        />
        <circle
          className="motion-reduce:animate-none animate-pp-stat-bob fill-amber-300/85"
          style={{ animationDelay: "0.35s" }}
          cx="68"
          cy="40"
          r="4"
        />
        <circle
          className="motion-reduce:animate-none animate-pp-stat-bob fill-yellow-500/75"
          style={{ animationDelay: "0.55s" }}
          cx="62"
          cy="52"
          r="3.5"
        />
      </svg>
    </div>
  );
}

/** Ящик + молния — апгрейды */
export function PublicUpgradeCrateDecor({ className = "" }: Props) {
  return (
    <div
      className={`pointer-events-none relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center sm:h-[5.25rem] sm:w-[5.25rem] ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 88 88" className="h-full w-full overflow-visible text-violet-400/90">
        <defs>
          <linearGradient id="pp-crate-u" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(109 40 217)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="rgb(234 88 12)" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <g className="motion-reduce:animate-none animate-pp-stat-bob origin-center" style={{ transformBox: "fill-box" }}>
          <path
            d="M44 22L20 35v22l24 13 24-13V35L44 22z"
            fill="url(#pp-crate-u)"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinejoin="round"
            opacity="0.92"
          />
          <path d="M20 35l24 13 24-13" stroke="currentColor" strokeWidth="1.1" opacity="0.45" />
        </g>
        <path
          className="motion-reduce:animate-none animate-pp-stat-zap fill-violet-200"
          d="M52 12L38 38h10l-4 22 20-28H52l4-20z"
          opacity="0.88"
        />
      </svg>
    </div>
  );
}
