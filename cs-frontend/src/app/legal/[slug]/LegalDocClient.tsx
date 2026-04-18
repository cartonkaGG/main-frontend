"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/SiteShell";
import { apiBase } from "@/lib/api";
import type { LegalSlug } from "@/lib/legalDocs";

type DocPayload = {
  key: string;
  version: number;
  title: string;
  body: string;
};

export function LegalDocClient({ slug }: { slug: LegalSlug }) {
  const [doc, setDoc] = useState<DocPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr(null);
      setDoc(null);
      try {
        const res = await fetch(`${apiBase}/api/legal-docs/${encodeURIComponent(slug)}`, {
          credentials: "include",
        });
        const text = await res.text();
        let data: DocPayload | null = null;
        try {
          data = text ? (JSON.parse(text) as DocPayload) : null;
        } catch {
          data = null;
        }
        if (!res.ok || !data) {
          if (!cancelled) setErr("Не удалось загрузить документ.");
          return;
        }
        if (!cancelled) setDoc(data);
      } catch {
        if (!cancelled) setErr("Нет связи с сервером.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-wider text-cb-flame hover:underline"
        >
          ← На главную
        </Link>
        {err ? (
          <p className="mt-8 text-sm text-red-300">{err}</p>
        ) : !doc ? (
          <p className="mt-8 text-sm text-zinc-500">Загрузка…</p>
        ) : (
          <article className="mt-8">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{doc.title}</h1>
            <p className="mt-2 text-xs text-zinc-500">Версия документа: {doc.version}</p>
            <div className="prose prose-invert prose-zinc mt-8 max-w-none whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
              {doc.body}
            </div>
          </article>
        )}
      </div>
    </SiteShell>
  );
}
