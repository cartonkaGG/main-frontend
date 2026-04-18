export function requestAuthModal(nextUrl?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("cd-auth-modal", {
      detail: { nextUrl: nextUrl ?? null },
    }),
  );
}

