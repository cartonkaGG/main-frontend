"use client";

/**
 * Локальна межа помилок для App Router (сегмент root).
 * Без цього Next у dev інколи показує «missing required error components, refreshing…».
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#020204] px-4 text-center text-zinc-200">
      <p className="text-sm text-red-300/95">{error.message || "Помилка завантаження"}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-xl border border-cb-stroke/80 bg-black/50 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-cb-flame/40"
      >
        Спробувати знову
      </button>
    </div>
  );
}
