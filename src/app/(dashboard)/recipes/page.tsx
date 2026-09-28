import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveAuthContext, getDefaultRestaurantId } from "@/lib/auth/resolve-context";
import { inventoryService } from "@/lib/inventory/service";
import { catalogService } from "@/lib/catalog/service";
import { PageIntro, SoftSection, cosyPastel } from "@/components/ui/soft";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Recetas" };

export default async function RecipesPage() {
  const context = await resolveAuthContext();
  const restaurantId = getDefaultRestaurantId(context);
  if (!restaurantId) redirect("/settings");

  const inventory = await inventoryService.getSnapshot(context, restaurantId);
  const catalog = await catalogService.getSnapshot(context, restaurantId);

  return (
    <div className="space-y-8">
      <PageIntro>
        Consumo teórico de ingredientes por producto vendido.
      </PageIntro>
      <SoftSection title="Recetas">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {inventory.recipes.map((recipe, index) => {
            const product = catalog.products.find(
              (p) => p.id === recipe.productId,
            );
            return (
              <div
                key={recipe.id}
                className={cn(
                  "flex min-h-[150px] flex-col justify-between rounded-[20px] p-4",
                  index % 3 === 0
                    ? cosyPastel(index)
                    : "bg-card text-card-foreground ring-1 ring-border",
                )}
              >
                <div>
                  <p className="text-[11px] opacity-70">Receta</p>
                  <p className="mt-2 text-base font-semibold leading-snug">
                    {product?.name ?? recipe.name}
                  </p>
                </div>
                <ul className="mt-4 space-y-1 text-sm opacity-80">
                  {recipe.lines.map((line) => {
                    const ingredient = inventory.ingredients.find(
                      (i) => i.id === line.ingredientId,
                    );
                    return (
                      <li key={line.id}>
                        {ingredient?.name ?? line.ingredientId}: {line.quantity}{" "}
                        {ingredient?.unit}
                        {line.wastageBps > 0
                          ? ` (+${line.wastageBps / 100}% merma)`
                          : ""}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </SoftSection>
    </div>
  );
}
