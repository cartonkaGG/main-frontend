"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CaseEditorForm } from "@/components/admin/CaseEditorForm";
import { apiFetch } from "@/lib/api";
import type { AdminCaseFull } from "@/lib/caseConfig";

export default function EditAdminCasePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [data, setData] = useState<AdminCaseFull | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await apiFetch<{ case: AdminCaseFull }>(`/api/admin/cases/${slug}`);
      if (!r.ok) {
        setErr(r.error || "Не найдено");
        return;
      }
      setData(r.data?.case ?? null);
      setErr(null);
    })();
  }, [slug]);

  if (err) {
    return (
      <p className="rounded-xl border border-red-500/40 bg-red-950/20 px-4 py-3 text-sm text-red-300">
        {err}
      </p>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-sm text-zinc-500">
        Загрузка кейса…
      </div>
    );
  }

  return <CaseEditorForm mode="edit" initial={data} />;
}
