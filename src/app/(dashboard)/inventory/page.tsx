import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InventoryPanel } from "@/components/inventory/inventory-panel";
import { SoftPanel } from "@/components/ui/soft";
import {
  getDefaultRestaurantId,
  resolveAuthContext,
} from "@/lib/auth/resolve-context";
import { inventoryService } from "@/lib/inventory/service";

export const metadata: Metadata = { title: "Inventario" };

export default async function InventoryPage() {
  const context = await resolveAuthContext();
  const restaurantId = getDefaultRestaurantId(context);
  if (!restaurantId) redirect("/settings");

  let snapshot;
  try {
    snapshot = await inventoryService.getSnapshot(context, restaurantId);
  } catch {
    return (
      <SoftPanel className="p-5">
        <h2 className="text-base font-semibold">Inventario</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Conecta Supabase y aplica migraciones para persistir inventario. En
          modo demo el stock se gestiona desde esta pantalla.
        </p>
      </SoftPanel>
    );
  }

  const canManage = inventoryService.canManage(context, restaurantId);

  return (
    <InventoryPanel
      restaurantId={restaurantId}
      initialSnapshot={snapshot}
      canManage={canManage}
    />
  );
}
