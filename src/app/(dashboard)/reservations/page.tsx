import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReservationsPanel } from "@/components/reservations/reservations-panel";
import {
  getDefaultRestaurantId,
  resolveAuthContext,
} from "@/lib/auth/resolve-context";
import { floorService } from "@/lib/floor/service";

export const metadata: Metadata = { title: "Reservas" };

export default async function ReservationsPage() {
  const context = await resolveAuthContext();
  const restaurantId = getDefaultRestaurantId(context);
  if (!restaurantId) redirect("/settings");

  const snapshot = await floorService.getSnapshot(context, restaurantId);

  return <ReservationsPanel snapshot={snapshot} />;
}
