"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type AdminLogRow = {
  at: string;
  adminUserSub: string;
  adminSteamId: string;
  adminDisplayName: string;
  ip: string;
  action: string;
  resource: string;
  targetLabel: string;
  detail: string;
  meta?: Record<string, unknown>;
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AdminLogRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setErr(null);
    const r = await apiFetch<{ logs: AdminLogRow[] }>("/api/admin/audit-logs?limit=300");
    setLoading(false);
    if (!r.ok) {
      setErr(r.error || "Не удалось загрузить");
      setLogs([]);
      return;
    }
    setLogs(Array.isArray(r.data?.logs) ? r.data!.logs : []);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Логи админов</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Баланс, роли, кейсы, RTP, промокоды, настройки главной — только после сохранения на сервере.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-xl border border-cb-stroke bg-black/40 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-amber-500/50 hover:text-white disabled:opacity-50"
        >
          {loading ? "…" : "Обновить"}
        </button>
      </div>

      {err ? (
        <p className="rounded-xl border border-red-500/35 bg-red-950/20 px-4 py-3 text-sm text-red-300">{err}</p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-cb-stroke bg-cb-panel/40">
        <table className="w-full min-w-[900px] text-left text-[12px]">
          <thead className="border-b border-cb-stroke bg-black/50 text-[10px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-3 py-2.5">Час</th>
              <th className="px-3 py-2.5">Админ</th>
              <th className="px-3 py-2.5">Действие</th>
              <th className="px-3 py-2.5">Цель</th>
              <th className="px-3 py-2.5">Детали</th>
              <th className="px-3 py-2.5">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-600">
                  Пока пусто. После действий админа записи появятся здесь.
                </td>
              </tr>
            ) : (
              logs.map((row, i) => (
                <tr key={`${row.at}-${i}`} className="border-b border-cb-stroke/40 align-top text-zinc-400">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-zinc-500">
                    {new Date(row.at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-zinc-200">{row.adminDisplayName || "—"}</div>
                    <div className="font-mono text-[10px] text-zinc-600">{row.adminSteamId || row.adminUserSub}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-md bg-amber-950/40 px-1.5 py-0.5 font-mono text-[11px] text-amber-200/90">
                      {row.action}
                    </span>
                    {row.resource ? (
                      <span className="ml-1 text-[10px] text-zinc-600">{row.resource}</span>
                    ) : null}
                  </td>
                  <td className="max-w-[200px] break-all px-3 py-2 font-mono text-[11px] text-zinc-300">
                    {row.targetLabel || "—"}
                  </td>
                  <td className="max-w-md px-3 py-2">
                    <div className="text-zinc-300">{row.detail || "—"}</div>
                    {row.meta && Object.keys(row.meta).length > 0 ? (
                      <pre className="mt-1 max-h-24 overflow-auto rounded-lg bg-black/40 p-2 text-[10px] text-zinc-500">
                        {JSON.stringify(row.meta, null, 0)}
                      </pre>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[10px] text-zinc-600">{row.ip || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
