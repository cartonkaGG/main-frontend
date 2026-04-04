/** Подія для глобального відкриття кроку капчі / редіректу на Steam (хедер, бета-гейт тощо). */
export const STEAM_LOGIN_REDIRECT_EVENT = "cd-steam-login-redirect";

export function requestSteamLoginRedirect() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STEAM_LOGIN_REDIRECT_EVENT));
}
