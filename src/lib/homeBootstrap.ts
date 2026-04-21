import type { CaseSummary } from "@/components/CaseCard";

function apiBaseForServer(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000").replace(/\/$/, "");
  return raw;
}

/**
 * Дані для головної з сервера (HTML одразу з JSON каталогу — без очікування useEffect на клієнті).
 */
export async function fetchHomeBootstrap(): Promise<{
  cases: CaseSummary[] | undefined;
}> {
  const base = apiBaseForServer();

  try {
    const casesRes = await fetch(`${base}/api/cases`, {
      next: { revalidate: 45 },
      headers: { Accept: "application/json" },
    });

    let cases: CaseSummary[] | undefined;
    if (casesRes.ok) {
      const j = (await casesRes.json()) as { cases?: CaseSummary[] };
      cases = Array.isArray(j.cases) ? j.cases : [];
    }

    return { cases };
  } catch {
    return { cases: undefined };
  }
}
