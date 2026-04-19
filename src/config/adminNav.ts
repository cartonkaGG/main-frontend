export type AdminNavLink = { href: string; label: string };

/** Раздел «Основное» в сайдбаре админки */
export const adminNavMainLinks: AdminNavLink[] = [
  { href: "/admin/stats", label: "Статистика" },
  { href: "/admin/cases", label: "Кейсы" },
  { href: "/admin/site-ui", label: "Главная: банер и карточки" },
  { href: "/admin/users", label: "Пользователи" },
];

/** Раздел «Логи» */
export const adminNavLogsLinks: AdminNavLink[] = [
  { href: "/admin/audit-logs", label: "Логи админов" },
  { href: "/admin/legal-docs", label: "Юридические документы" },
  { href: "/admin/support", label: "Обращения пользователей" },
  { href: "/admin/withdrawals", label: "Вывод скинов (Market.csgo)" },
  { href: "/admin/deposits", label: "История пополнений баланса" },
  { href: "/admin/beta", label: "Заявки на бета-доступ" },
];

/** Раздел «Партнерка» */
export const adminNavPartnerLinks: AdminNavLink[] = [
  { href: "/admin/promos", label: "Промокоды" },
  { href: "/admin/partners", label: "Партнёрская программа" },
  { href: "/admin/partner-faq", label: "F.A.Q партнеров" },
];

/** Прочие пункты сайдбара (вне групп выше). */
export const adminNavRestLinks: AdminNavLink[] = [];

export function isAdminPathActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href + "/");
}

export function isUnderAdminMain(pathname: string) {
  return adminNavMainLinks.some((l) => isAdminPathActive(pathname, l.href));
}

export function isUnderAdminLogs(pathname: string) {
  return adminNavLogsLinks.some((l) => isAdminPathActive(pathname, l.href));
}

export function isUnderAdminPartner(pathname: string) {
  return adminNavPartnerLinks.some((l) => isAdminPathActive(pathname, l.href));
}
