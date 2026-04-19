import { requestAuthModal } from "@/lib/authModal";

function isLocalFrontendUrl(url: string): boolean {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `http://${url}`);
    return (
      (u.hostname === "localhost" || u.hostname === "127.0.0.1") &&
      (u.port === "3000" || u.port === "")
    );
  } catch {
    return false;
  }
}

/** Локальний API на :4000 — з браузера краще бити в /api на Next (той самий origin), інакше cookies/CORS між localhost і 127.0.0.1 ламаються. */
function isLocalLoopbackApiPort4000(url: string): boolean {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `http://${url}`);
    const h = u.hostname.toLowerCase();
    if (h !== "localhost" && h !== "127.0.0.1") return false;
    return u.port === "4000";
  } catch {
    return false;
  }
}

/** База для fetch на сервері (RSC тощо) — завжди абсолютний URL бекенду. */
function getServerApiPrefix(): string {
  const a = process.env.API_INTERNAL_URL?.trim().replace(/\/$/, "");
  const b = process.env.BACKEND_PROXY_URL?.trim().replace(/\/$/, "");
  if (a) return a;
  if (b) return b;
  const pub = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  if (pub && !isLocalFrontendUrl(pub)) return pub;
  return "http://127.0.0.1:4000";
}

/**
 * База для fetch у браузері: порожній рядок = той самий origin (Next проксує /api/* на бекенд через app/api/[...path]/route.ts).
 * Якщо задано зовнішній API (інший origin) — повний URL.
 */
function getBrowserApiPrefix(): string {
  const env = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  if (!env) return "";
  if (isLocalLoopbackApiPort4000(env)) return "";
  try {
    if (new URL(env).origin === window.location.origin) return "";
  } catch {
    return env || "http://127.0.0.1:4000";
  }
  return env;
}

function getFetchPrefix(): string {
  return typeof window === "undefined" ? getServerApiPrefix() : getBrowserApiPrefix();
}

/** Повний URL або відносний шлях до API (у браузері — через /api проксі Next, коли prefix порожній). */
export function joinApiUrl(path: string): string {
  const prefix = getFetchPrefix();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!prefix) return p;
  return `${prefix}${p}`;
}

/**
 * Публічна адреса бекенду для Socket.IO, прямих fetch зі сирими URL тощо.
 * Якщо NEXT_PUBLIC_API_URL вказує на фронт (:3000) — підставляємо локальний :4000.
 */
function getPublicBackendUrl(): string {
  const env = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  if (!env || isLocalFrontendUrl(env)) return "http://127.0.0.1:4000";
  return env;
}

export const apiBase = getPublicBackendUrl();

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cd_token");
}

export function setToken(token: string) {
  localStorage.setItem("cd_token", token);
}

export function clearToken() {
  localStorage.removeItem("cd_token");
}

export type ApiFieldErrors = {
  fieldErrors?: Record<string, string[] | undefined>;
  formErrors?: string[];
};

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{
  ok: boolean;
  data?: T;
  error?: string;
  details?: ApiFieldErrors;
  status: number;
}> {
  const token = typeof window !== "undefined" ? getToken() : null;
  try {
    const res = await fetch(joinApiUrl(path), {
      ...init,
      headers: {
        ...(init?.headers as Record<string, string> | undefined),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });
    const text = await res.text();
    let data: T | undefined;
    try {
      data = text ? (JSON.parse(text) as T) : undefined;
    } catch {
      data = undefined;
    }
    if (!res.ok) {
      const payload = data as
        | { error?: string; details?: ApiFieldErrors; code?: string }
        | undefined;
      const err = payload?.error || `Ошибка ${res.status}`;
      const details = payload?.details;

      if (
        res.status === 401 &&
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/auth/callback") &&
        payload?.code !== "CLOSED_BETA_AUTH"
      ) {
        requestAuthModal(`${window.location.pathname}${window.location.search}`);
      }

      return { ok: false, error: err, details, status: res.status };
    }
    return { ok: true, data, status: res.status };
  } catch {
    return { ok: false, error: "Нет связи с API", status: 0 };
  }
}

export function steamLoginUrl() {
  return joinApiUrl("/api/auth/steam");
}

/** Якщо порожньо — капча на клієнті вимкнена (локально без Turnstile). */
export function turnstileSiteKey(): string {
  return (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim();
}

/**
 * Обміняти токен Turnstile на httpOnly-cookie `cd_login_gate` (потрібно перед GET /api/auth/steam,
 * якщо на бекенді задано TURNSTILE_SECRET_KEY).
 */
/** Подтверждение версий юр. документов перед первым входом Steam (httpOnly `cd_legal_gate`). */
/** Сохранить согласие для уже вошедшего пользователя (без httpOnly-cookie для Steam). */
export async function postMeAcceptLegal(payload: {
  termsVersion: number;
  privacyVersion: number;
  cookiesVersion: number;
}): Promise<{ ok: boolean; error?: string }> {
  const r = await apiFetch<{ ok?: boolean }>("/api/me/accept-legal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true };
}

export async function postLegalAccept(payload: {
  termsVersion: number;
  privacyVersion: number;
  cookiesVersion: number;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(joinApiUrl("/api/auth/legal-accept"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
    const text = await res.text();
    let data: { error?: string } = {};
    try {
      data = text ? (JSON.parse(text) as { error?: string }) : {};
    } catch {
      data = {};
    }
    if (!res.ok) {
      return { ok: false, error: data.error || `Ошибка ${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Нет связи с API" };
  }
}

export async function postLoginCaptcha(turnstileToken: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(joinApiUrl("/api/auth/login-captcha"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: turnstileToken }),
      credentials: "include",
    });
    const text = await res.text();
    let data: { error?: string } = {};
    try {
      data = text ? (JSON.parse(text) as { error?: string }) : {};
    } catch {
      data = {};
    }
    if (!res.ok) {
      return { ok: false, error: data.error || `Ошибка ${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Нет связи с API" };
  }
}
