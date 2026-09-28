import {
  LayoutDashboard,
  Settings2,
  UtensilsCrossed,
  Package,
  BarChart3,
  Users,
  PencilRuler,
  Warehouse,
  ChefHat,
  CircleDollarSign,
  MessageSquareWarning,
  type LucideIcon,
} from "lucide-react";

export type AppNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  soon?: boolean;
};

export const operationNav: AppNavItem[] = [
  { title: "Panel", href: "/dashboard", icon: LayoutDashboard },
  { title: "Salón", href: "/floor", icon: UtensilsCrossed },
  { title: "Menú", href: "/products", icon: Package },
  { title: "Inventario", href: "/inventory", icon: Warehouse },
  { title: "Recetas", href: "/recipes", icon: ChefHat },
  { title: "Caja", href: "/cashier", icon: CircleDollarSign },
  { title: "Reportes", href: "/reports", icon: BarChart3 },
];

export const adminNav: AppNavItem[] = [
  { title: "Plano de mesas", href: "/floor/editor", icon: PencilRuler },
  { title: "Personal", href: "/staff", icon: Users },
  { title: "Configuración", href: "/settings", icon: Settings2 },
];

/** Temporary nav for beta testers — remove when no longer needed. */
export const testingNav: AppNavItem[] = [
  { title: "Feedback", href: "/feedback", icon: MessageSquareWarning },
];

const allNav = [
  ...operationNav,
  ...adminNav,
  ...testingNav,
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
