"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type LegalDoc = { version: number; title: string; body: string };
type LegalDocsFull = { terms: LegalDoc; privacy: LegalDoc; cookies: LegalDoc };

export default function AdminLegalDocsPage() {
  const [data, setData] = useState<LegalDocsFull | null>(null);
  const [termsTitle, setTermsTitle] = useState("");
  const [termsBody, setTermsBody] = useState("");
  const [privacyTitle, setPrivacyTitle] = useState("");
  const [privacyBody, setPrivacyBody] = useState("");
  const [cookiesTitle, setCookiesTitle] = useState("");
  const [cookiesBody, setCookiesBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch<LegalDocsFull>("/api/admin/legal-docs");
    setLoading(false);
    if (!r.ok) {
      setErr(r.error || "Не удалось загрузить");
      return;
    }
    const d = r.data!;
    setData(d);
    setTermsTitle(d.terms.title);
    setTermsBody(d.terms.body);
    setPrivacyTitle(d.privacy.title);
    setPrivacyBody(d.privacy.body);
    setCookiesTitle(d.cookies.title);
    setCookiesBody(d.cookies.body);
    setErr(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!data) return;
    setErr(null);
    setSaving(true);
    const r = await apiFetch<LegalDocsFull>("/api/admin/legal-docs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        terms: { title: termsTitle, body: termsBody },
        privacy: { title: privacyTitle, body: privacyBody },
        cookies: { title: cookiesTitle, body: cookiesBody },
      }),
    });
    setSaving(false);
    if (!r.ok) {
      setErr(r.error || "Ошибка сохранения");
      return;
    }
    const d = r.data!;
    setData(d);
    setTermsTitle(d.terms.title);
    setTermsBody(d.terms.body);
    setPrivacyTitle(d.privacy.title);
    setPrivacyBody(d.privacy.body);
    setCookiesTitle(d.cookies.title);
    setCookiesBody(d.cookies.body);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Юридические документы</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Редактируйте тексты, отображаемые на страницах{" "}
          <span className="font-mono text-zinc-300">/legal/terms</span>,{" "}
          <span className="font-mono text-zinc-300">/legal/privacy</span>,{" "}
          <span className="font-mono text-zinc-300">/legal/cookies</span> и в футере. При изменении текста или
          заголовка версия документа увеличивается — новым пользователям нужно принять актуальные версии перед
          первой регистрацией через Steam.
        </p>
      </div>

      {err && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {err}
        </div>
      )}

      {loading || !data ? (
        <p className="text-sm text-zinc-500">Загрузка…</p>
      ) : (
        <div className="space-y-10">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">
              Пользовательское соглашение{" "}
              <span className="text-xs font-normal text-zinc-500">(v{data.terms.version})</span>
            </h2>
            <input
              value={termsTitle}
              onChange={(e) => setTermsTitle(e.target.value)}
              className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
              placeholder="Заголовок"
            />
            <textarea
              value={termsBody}
              onChange={(e) => setTermsBody(e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 font-mono text-sm text-zinc-200"
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">
              Политика конфиденциальности{" "}
              <span className="text-xs font-normal text-zinc-500">(v{data.privacy.version})</span>
            </h2>
            <input
              value={privacyTitle}
              onChange={(e) => setPrivacyTitle(e.target.value)}
              className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
              placeholder="Заголовок"
            />
            <textarea
              value={privacyBody}
              onChange={(e) => setPrivacyBody(e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 font-mono text-sm text-zinc-200"
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">
              Политика Cookie{" "}
              <span className="text-xs font-normal text-zinc-500">(v{data.cookies.version})</span>
            </h2>
            <input
              value={cookiesTitle}
              onChange={(e) => setCookiesTitle(e.target.value)}
              className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 text-white"
              placeholder="Заголовок"
            />
            <textarea
              value={cookiesBody}
              onChange={(e) => setCookiesBody(e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-cb-stroke bg-black/40 px-3 py-2 font-mono text-sm text-zinc-200"
            />
          </section>

          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-xl bg-gradient-to-r from-red-700 to-cb-flame px-8 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/30 disabled:opacity-50"
          >
            {saving ? "Сохранение…" : "Сохранить все"}
          </button>
        </div>
      )}
    </div>
  );
}
