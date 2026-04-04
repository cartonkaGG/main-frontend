/** М’яка блискавка (fill + round stroke); колір через `currentColor`. */
export function RoundedZapIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1.55}
        strokeLinejoin="round"
        strokeLinecap="round"
        paintOrder="stroke fill"
        vectorEffect="nonScalingStroke"
        d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
      />
    </svg>
  );
}
