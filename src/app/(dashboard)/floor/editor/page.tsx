import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FloorEditorClientEntry } from "@/components/floor/floor-editor-client-entry";
import { getDefaultRestaurantId, resolveAuthContext } from "@/lib/auth/resolve-context";
import { floorService } from "@/lib/floor/service";

export const metadata: Metadata = {
  title: "Editor de plano",
};

export default async function FloorEditorPage() {
  const auth = await resolveAuthContext();
  const restaurantId = getDefaultRestaurantId(auth);
  if (!restaurantId) {
    redirect("/settings");
  }

  if (!floorService.canManageFloor(auth, restaurantId)) {
    redirect("/floor");
  }

  return <FloorEditorClientEntry restaurantId={restaurantId} />;
}
