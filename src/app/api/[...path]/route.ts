import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Куди проксувати /api/* на сервері Next (локально — зазвичай :4000). */
function backendOrigin(): string {
  const a = process.env.BACKEND_PROXY_URL?.trim();
  const b = process.env.API_INTERNAL_URL?.trim();
  if (a) return a.replace(/\/$/, "");
  if (b) return b.replace(/\/$/, "");
  const pub = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  if (pub && !isLocalFrontendUrl(pub)) return pub;
  return "http://127.0.0.1:4000";
}

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

const forwardHeaderNames = [
  "authorization",
  "cookie",
  "content-type",
  "accept",
  "accept-language",
  "user-agent",
  "x-requested-with",
];

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTransientRetry(
  target: string,
  init: RequestInit,
  method: string,
): Promise<Response> {
  // After admin writes (slides, promos) backend may briefly restart in dev/watch mode.
  // A short retry avoids noisy 503 bursts for parallel GET polling on the frontend.
  const attempts = method === "GET" || method === "HEAD" ? 3 : 1;
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(target, init);
    } catch (e) {
      lastErr = e;
      if (i >= attempts - 1) break;
      await sleep(120 * (i + 1));
    }
  }
  throw lastErr;
}

async function proxy(req: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join("/");
  const origin = backendOrigin();
  const target = `${origin}/api/${path}${req.nextUrl.search}`;
  const headers = new Headers();
  for (const name of forwardHeaderNames) {
    const v = req.headers.get(name);
    if (v) headers.set(name, v);
  }
  const method = req.method;
  let body: BodyInit | undefined;
  if (!["GET", "HEAD"].includes(method)) {
    body = await req.arrayBuffer();
  }
  try {
    const res = await fetchWithTransientRetry(
      target,
      {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      },
      method,
    );
    const outHeaders = new Headers(res.headers);
    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: outHeaders,
    });
  } catch {
    /** ECONNREFUSED тощо — без бекенду fetch кидає, інакше Next логує «TypeError: fetch failed» на кожен /api/*. */
    if (method === "HEAD") {
      return new NextResponse(null, { status: 503 });
    }
    const hint =
      process.env.NODE_ENV === "development"
        ? `Не удалось подключиться к ${origin}. Запустите API (например npm run dev в stormbattle/backend, порт 4000) или задайте BACKEND_PROXY_URL / API_INTERNAL_URL.`
        : "Сервис временно недоступен.";
    return NextResponse.json(
      { error: hint, code: "BACKEND_UNAVAILABLE" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}

type RouteCtx = { params: { path: string[] } };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path ?? []);
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path ?? []);
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path ?? []);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path ?? []);
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path ?? []);
}
