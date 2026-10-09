import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FloorPlanEditor } from "@/components/floor/floor-plan-editor";
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

  const snapshot = await floorService.getSnapshot(auth, restaurantId);

  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col gap-3 md:min-h-[calc(100dvh-8.5rem)]">
      <FloorPlanEditor
        initialSnapshot={snapshot}
        restaurantId={restaurantId}
        className="min-h-0 flex-1"
      />
    </div>
  );
}
