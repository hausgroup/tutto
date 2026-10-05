import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RecipesPanel } from "@/components/recipes/recipes-panel";
import {
  getDefaultRestaurantId,
  resolveAuthContext,
} from "@/lib/auth/resolve-context";
import { catalogService } from "@/lib/catalog/service";
import { inventoryService } from "@/lib/inventory/service";

export const metadata: Metadata = { title: "Recetas" };

export default async function RecipesPage() {
  const context = await resolveAuthContext();
  const restaurantId = getDefaultRestaurantId(context);
  if (!restaurantId) redirect("/settings");

  const inventory = await inventoryService.getSnapshot(context, restaurantId);
  const catalog = await catalogService.getSnapshot(context, restaurantId);
  const canManage = inventoryService.canManageRecipes(context, restaurantId);

  return (
    <RecipesPanel
      restaurantId={restaurantId}
      inventory={inventory}
      products={catalog.products}
      canManage={canManage}
    />
  );
}
