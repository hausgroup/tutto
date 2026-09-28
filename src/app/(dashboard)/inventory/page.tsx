import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, Package } from "lucide-react";
import { InventoryAdjustForm } from "@/components/inventory/inventory-adjust-form";
import { resolveAuthContext, getDefaultRestaurantId } from "@/lib/auth/resolve-context";
import { inventoryService } from "@/lib/inventory/service";
import { formatCurrency } from "@/lib/utils/money";
import {
  COSY_ACCENT,
  PageIntro,
  SoftChip,
  SoftPanel,
  SoftSection,
  SoftStat,
  cosyPastel,
} from "@/components/ui/soft";
import { cn } from "@/lib/utils";

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

  const lowStock = snapshot.ingredients.filter(
    (i) => i.isActive && i.stockQuantity <= i.minStockQuantity,
  );

  return (
    <div className="space-y-8">
      <PageIntro>Stock teórico, movimientos y alertas de mínimo.</PageIntro>

      <div className="grid gap-3 sm:grid-cols-2">
        <SoftStat
          index={0}
          icon={Package}
          label="Ingredientes"
          value={snapshot.ingredients.length}
          hint="Catálogo activo de insumos"
        />
        <SoftStat
          index={3}
          icon={AlertTriangle}
          label="Stock bajo"
          value={lowStock.length}
          hint={
            lowStock.length > 0
              ? lowStock.map((i) => i.name).slice(0, 3).join(", ")
              : "Todo dentro del mínimo"
          }
        />
      </div>

      {lowStock.length > 0 ? (
        <SoftSection title="Alertas">
          <div className="flex flex-wrap gap-2">
            {lowStock.map((item) => (
              <SoftChip key={item.id} className={COSY_ACCENT} active>
                {item.name}: {item.stockQuantity} {item.unit}
              </SoftChip>
            ))}
          </div>
        </SoftSection>
      ) : null}

      <SoftSection title="Insumos">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {snapshot.ingredients.map((ingredient, index) => {
            const isLow =
              ingredient.isActive &&
              ingredient.stockQuantity <= ingredient.minStockQuantity;
            return (
              <div
                key={ingredient.id}
                className={cn(
                  "flex min-h-[180px] flex-col justify-between rounded-[20px] p-4",
                  isLow
                    ? cosyPastel(3)
                    : "bg-card text-card-foreground ring-1 ring-border",
                )}
              >
                <div>
                  <p className="text-[11px] opacity-70">
                    Mín. {ingredient.minStockQuantity} {ingredient.unit}
                  </p>
                  <p className="mt-2 text-base font-semibold leading-snug">
                    {ingredient.name}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                    {ingredient.stockQuantity}{" "}
                    <span className="text-sm font-medium opacity-70">
                      {ingredient.unit}
                    </span>
                  </p>
                  <p className="mt-1 text-xs opacity-70">
                    Costo: {formatCurrency(ingredient.costMinorPerUnit)}
                  </p>
                </div>
                <div className={cn(isLow ? "opacity-90" : "")}>
                  <InventoryAdjustForm ingredientId={ingredient.id} />
                </div>
              </div>
            );
          })}
        </div>
      </SoftSection>
    </div>
  );
}
