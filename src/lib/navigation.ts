import {
  Settings2,
  UtensilsCrossed,
  Package,
  BarChart3,
  Users,
  Warehouse,
  ChefHat,
  CircleDollarSign,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

export type AppNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  soon?: boolean;
};

export const operationNav: AppNavItem[] = [
  { title: "Caja", href: "/cashier", icon: CircleDollarSign },
  { title: "Salón", href: "/floor", icon: UtensilsCrossed },
  { title: "Reservas", href: "/reservations", icon: CalendarDays },
  { title: "Menú", href: "/products", icon: Package },
  { title: "Inventario", href: "/inventory", icon: Warehouse },
  { title: "Recetas", href: "/recipes", icon: ChefHat },
];

export const adminNav: AppNavItem[] = [
  { title: "Reportes", href: "/reports", icon: BarChart3 },
  { title: "Personal", href: "/staff", icon: Users },
  { title: "Configuración", href: "/settings", icon: Settings2 },
];

const allNav = [
  ...operationNav,
  ...adminNav,
  { title: "POS", href: "/pos", icon: UtensilsCrossed },
];

/** Resolve the active page title from the current pathname. */
export function getPageTitle(pathname: string): string {
  const exact = allNav.find((item) => item.href === pathname);
  if (exact) return exact.title;

  const nested = [...allNav]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    );

  if (pathname.startsWith("/pos/")) return "POS";

  return nested?.title ?? "Haus POS";
}
