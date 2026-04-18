import { AdminAreaGuard } from "@/components/AdminAreaGuard";
import { AdminDashboardShell } from "@/components/AdminDashboardShell";
import { SiteShell } from "@/components/SiteShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell>
      <AdminAreaGuard>
        <AdminDashboardShell>{children}</AdminDashboardShell>
      </AdminAreaGuard>
    </SiteShell>
  );
}
