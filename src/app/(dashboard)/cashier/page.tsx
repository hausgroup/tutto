import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CashierPanel } from "@/components/cashier/cashier-panel";
import { resolveAuthContext, getDefaultRestaurantId } from "@/lib/auth/resolve-context";
import { cashierService } from "@/lib/orders/service";

export const metadata: Metadata = { title: "Caja" };

export default async function CashierPage() {
  const context = await resolveAuthContext();
  const restaurantId = getDefaultRestaurantId(context);
  if (!restaurantId) redirect("/settings");

  const session = await cashierService.getOpenSession(context, restaurantId);

  return (
    <CashierPanel initialSession={session ? structuredClone(session) : null} />
  );
}
