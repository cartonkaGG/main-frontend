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

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
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
      const err =
        (data as { error?: string } | undefined)?.error ||
        `Ошибка ${res.status}`;

      if (
        res.status === 401 &&
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/auth/callback")
      ) {
        requestAuthModal(`${window.location.pathname}${window.location.search}`);
      }

      return { ok: false, error: err, status: res.status };
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
