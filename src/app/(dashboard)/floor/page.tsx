import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FloorClientEntry } from "@/components/floor/floor-client-entry";
import {
  getDefaultRestaurantId,
  resolveAuthContext,
} from "@/lib/auth/resolve-context";

export const metadata: Metadata = {
  title: "Salón",
};

export default async function FloorPage() {
  const context = await resolveAuthContext();
  const restaurantId = getDefaultRestaurantId(context);
  if (!restaurantId) redirect("/settings");

  return <FloorClientEntry restaurantId={restaurantId} />;
}
