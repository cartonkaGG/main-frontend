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
  const headers: HeadersInit = {
    ...(init?.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers,
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

export { base as apiBase };
