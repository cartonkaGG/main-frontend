import { requestAuthModal } from "@/lib/authModal";

const base = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000").replace(
  /\/$/,
  ""
);

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
    const res = await fetch(`${base}${path}`, {
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
  return `${base}/api/auth/steam`;
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
    const res = await fetch(`${base}/api/auth/legal-accept`, {
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
    const res = await fetch(`${base}/api/auth/login-captcha`, {
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

export { base as apiBase };
