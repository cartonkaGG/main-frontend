import { AdminGuard } from "@/components/AdminGuard";
import { SiteShell } from "@/components/SiteShell";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell>
      <AdminGuard>
        <div className="border-b border-cb-stroke/80 bg-cb-panel/25 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 text-sm">
            <Link href="/" className="text-zinc-500 hover:text-cb-flame">
              ← На сайт
            </Link>
            <span className="text-zinc-700">|</span>
            <span className="font-semibold uppercase tracking-wider text-amber-500/90">Админ</span>
            <Link
              href="/admin/cases"
              className="text-zinc-400 hover:text-white"
            >
              Кейсы
            </Link>
            <Link href="/admin/promos" className="text-zinc-400 hover:text-white">
              Промокоды
            </Link>
            <Link
              href="/admin/users"
              className="text-zinc-400 hover:text-white"
            >
              Пользователи
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</div>
      </AdminGuard>
    </SiteShell>
  );
}
