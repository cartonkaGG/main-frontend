"use client";

import { useId } from "react";

/** Кольори рівня: цифра + обводка круга (градієнт dim → main). */
type LevelColors = { main: string; dim: string };

/** Індекс у масиві = номер рівня (0…5). Рівень 0 — стартовий для нових партнерів, не показується в «Уровни» у F.A.Q. */
const LEVEL_THEMES: LevelColors[] = [
  { main: "#D8D8E0", dim: "#6B21A8" },
  { main: "#FACC15", dim: "#A16207" },
  { main: "#22D3EE", dim: "#0E7490" },
  { main: "#34D399", dim: "#047857" },
  { main: "#FB923C", dim: "#C2410C" },
  { main: "#FF3131", dim: "#991B1B" },
];

const R_INNER = 31.15;
const R_OUTER = 39.45;
/** Товсті «блоки», ~12% радіуса (як на референсі). */
const SW_INNER = Math.max(3.6, R_INNER * 0.12);
const SW_OUTER = Math.max(4.2, R_OUTER * 0.12);

function circ(r: number) {
  return 2 * Math.PI * r;
}

/** Рівно `segments` товстих дуг + рівні проміжки (сума довжин = коло). */
function dashPattern3(r: number) {
  const C = circ(r);
  const gap = (17 / 360) * C;
  const dash = C / 3 - gap;
  return `${dash} ${gap}`;
}

function dashPattern4(r: number) {
  const C = circ(r);
  const gap = (13 / 360) * C;
  const dash = C / 4 - gap;
  return `${dash} ${gap}`;
}

function SegmentedRing({
  r,
  dash,
  dur,
  cw,
  sw,
  stroke,
  opacity,
  /** Статичний поворот (°), щоб прорізи зовнішнього ряду не збігались з внутрішнім */
  phaseDeg = 0,
}: {
  r: number;
  dash: string;
  dur: string;
  cw: boolean;
  sw: number;
  stroke: string;
  opacity: number;
  phaseDeg?: number;
}) {
  return (
    <g>
      <animateTransform
        attributeName="transform"
        type="rotate"
        from={cw ? "0 0 0" : "360 0 0"}
        to={cw ? "360 0 0" : "0 0 0"}
        dur={dur}
        repeatCount="indefinite"
      />
      <g transform={`rotate(${phaseDeg})`}>
        <circle
          r={r}
          cx="0"
          cy="0"
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
          strokeDasharray={dash}
          strokeLinecap="round"
          opacity={opacity}
          transform="rotate(-90)"
        />
      </g>
    </g>
  );
}

export function PartnerLevelHudOrb({
  level,
  compact,
  showUnit = true,
}: {
  level: number;
  /** Компактний бейдж біля профілю (без підпису «ур.»). */
  compact?: boolean;
  /** Показувати підпис «ур.» під орбом у великому варіанті. */
  showUnit?: boolean;
}) {
  const n = Math.min(5, Math.max(0, level));
  const t = LEVEL_THEMES[n];
  const rid = useId().replace(/:/g, "");
  const digitSize = compact ? 20 : 27;

  return (
    <div
      className={`flex min-w-0 flex-col items-center ${compact ? "shrink-0 gap-0" : "flex-1 gap-3"}`}
    >
      <div
        className={`relative mx-auto aspect-square w-full ${
          compact ? "max-w-[3.25rem]" : "max-w-[9.5rem] sm:max-w-[10.5rem]"
        }`}
        role="img"
        aria-label={`Уровень ${n}`}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={`${rid}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={t.dim} />
              <stop offset="100%" stopColor={t.main} />
            </linearGradient>
            <clipPath id={`${rid}-inner`}>
              <circle cx="50" cy="50" r="43.2" />
            </clipPath>
          </defs>

          <circle cx="50" cy="50" r="46" fill="#0e0e0c" />

          <g clipPath={`url(#${rid}-inner)`} className="motion-reduce:opacity-0">
            <g transform="translate(50 50)">
              {/* Внутрішнє кільце: 3 товсті дуги */}
              <SegmentedRing
                r={R_INNER}
                dash={dashPattern3(R_INNER)}
                dur="22s"
                cw={false}
                sw={SW_INNER}
                stroke={t.main}
                opacity={0.92}
                phaseDeg={0}
              />
              {/* Зовнішнє кільце: 4 дуги, фаза зсунута */}
              <SegmentedRing
                r={R_OUTER}
                dash={dashPattern4(R_OUTER)}
                dur="31s"
                cw
                sw={SW_OUTER}
                stroke={t.main}
                opacity={0.94}
                phaseDeg={28}
              />
            </g>
          </g>

          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={`url(#${rid}-ring)`}
            strokeWidth="2.1"
          />

          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="central"
            fill={t.main}
            fontSize={digitSize}
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
            style={{
              paintOrder: "stroke fill",
              stroke: "rgba(0,0,0,0.55)",
              strokeWidth: compact ? 1.5 : 2.1,
            }}
          >
            {n}
          </text>
        </svg>
      </div>
      {!compact && showUnit ? (
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 sm:text-[12px]">
          ур.
        </span>
      ) : null}
    </div>
  );
}
