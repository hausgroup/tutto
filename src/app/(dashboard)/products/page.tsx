import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getDefaultRestaurantId,
  resolveAuthContext,
} from "@/lib/auth/resolve-context";
import { catalogService } from "@/lib/catalog/service";
import { MenuCatalog } from "@/components/catalog/menu-catalog";
import { SoftPanel } from "@/components/ui/soft";

export const metadata: Metadata = { title: "Menú" };

export default async function ProductsPage() {
  const context = await resolveAuthContext();
  const restaurantId = getDefaultRestaurantId(context);
  if (!restaurantId) redirect("/settings");

  let snapshot;
  try {
    snapshot = await catalogService.getSnapshot(context, restaurantId);
  } catch {
    return (
      <SoftPanel className="p-5">
        <h2 className="text-base font-semibold">Menú</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Conecta Supabase y aplica migraciones para persistir el catálogo. En
          modo demo los productos están disponibles en POS.
        </p>
      </SoftPanel>
    );
  }

  return (
    <MenuCatalog
      restaurantId={restaurantId}
      initialSnapshot={snapshot}
      canManage={catalogService.canManage(context, restaurantId)}
    />
  );
}
