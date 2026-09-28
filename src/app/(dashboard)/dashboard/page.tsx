import Link from "next/link";
import {
  LayoutGrid,
  MapPinned,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  Wallet,
  ChartColumn,
  Package,
  Settings,
  PencilRuler,
} from "lucide-react";
import {
  getDefaultRestaurantId,
  resolveAuthContext,
} from "@/lib/auth/resolve-context";
import { floorService } from "@/lib/floor/service";
import { reportService } from "@/lib/orders/service";
import { formatCurrency } from "@/lib/utils/money";
import { canUseDemoExperience, isSupabaseConfigured } from "@/lib/env";
import { PageIntro, SoftSection, SoftStat, cosyPastel } from "@/components/ui/soft";
import { cn } from "@/lib/utils";

const QUICK_LINKS = [
  { href: "/floor", label: "Salón", icon: LayoutGrid },
  { href: "/products", label: "Menú", icon: UtensilsCrossed },
  { href: "/inventory", label: "Inventario", icon: Package },
  { href: "/cashier", label: "Caja", icon: Wallet },
  { href: "/reports", label: "Reportes", icon: ChartColumn },
  { href: "/floor/editor", label: "Editor", icon: PencilRuler },
  { href: "/settings", label: "Ajustes", icon: Settings },
] as const;

export default async function DashboardPage() {
  const auth = await resolveAuthContext();
  const restaurant = auth.memberships[0];
  const restaurantId = getDefaultRestaurantId(auth);
  const summary = restaurantId
    ? await floorService.getSummary(auth, restaurantId)
    : null;

  let salesTodayMinor = 0;
  let salesTodayOrders = 0;
  if (restaurantId) {
    try {
      const sales = await reportService.getSalesSummary(auth, restaurantId, {
        period: "today",
      });
      salesTodayMinor = sales.grossSalesMinor;
      salesTodayOrders = sales.orderCount;
    } catch {
      /* Supabase path not wired yet */
    }
  }

  const openTables = summary
    ? summary.byStatus.occupied +
      summary.byStatus.order_ready +
      summary.byStatus.payment_pending
    : 0;
  const attention = summary
    ? summary.byStatus.order_ready + summary.byStatus.payment_pending
    : 0;

  return (
    <div className="space-y-8">
      <PageIntro>
        {canUseDemoExperience()
          ? "Vista demo — conecta Supabase para datos persistentes."
          : "Resumen operativo del restaurante."}
      </PageIntro>

      <SoftSection title="Hoy">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SoftStat
            index={0}
            icon={ShoppingBag}
            label="Ventas de hoy"
            value={formatCurrency(salesTodayMinor)}
            hint={
              salesTodayOrders > 0
                ? `${salesTodayOrders} pedido(s) cerrado(s)`
                : "Cobra desde el POS en una mesa"
            }
          />
          <SoftStat
            index={1}
            icon={MapPinned}
            label="Mesas activas"
            value={summary ? `${openTables}/${summary.activeTables}` : "—"}
            hint={
              attention > 0
                ? `${attention} pendientes de servicio o cobro`
                : "Sin alertas de salón"
            }
          />
          <SoftStat
            index={2}
            icon={LayoutGrid}
            label="Áreas configuradas"
            value={summary?.areasCount ?? "—"}
            hint="Ver plano del salón"
          />
          <SoftStat
            index={4}
            icon={Store}
            label="Restaurante activo"
            value={restaurant?.restaurantName ?? "Sin asignación"}
            hint={`Rol: ${restaurant?.roleName ?? "—"}`}
          />
        </div>
      </SoftSection>

      <SoftSection title="Operación">
        <p className="mb-3 text-sm text-muted-foreground">
          {isSupabaseConfigured()
            ? "Supabase detectado. Aplica migraciones y seed de catálogo/pedidos si faltan datos."
            : "Modo demo: catálogo, POS, inventario, caja y reportes en memoria."}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {QUICK_LINKS.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[108px] flex-col items-start justify-between rounded-[20px] p-4 transition-transform active:scale-[0.98]",
                  cosyPastel(index),
                )}
              >
                <Icon className="size-5 opacity-80" aria-hidden />
                <p className="text-base font-semibold leading-tight">
                  {item.label}
                </p>
              </Link>
            );
          })}
        </div>
      </SoftSection>
    </div>
  );
}
