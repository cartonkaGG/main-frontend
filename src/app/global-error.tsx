"use client";

/**
 * Помилка в root layout — потрібні власні html/body.
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body className="min-h-dvh bg-[#020204] text-zinc-100 antialiased">
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-sm text-red-300/95">{error.message || "Критична помилка"}</p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl border border-zinc-600 bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Оновити
          </button>
        </div>
      </body>
    </html>
  );
}
