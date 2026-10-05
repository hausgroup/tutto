import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StaffPanel } from "@/components/staff/staff-panel";
import {
  getDefaultRestaurantId,
  resolveAuthContext,
} from "@/lib/auth/resolve-context";
import { staffService } from "@/lib/staff/service";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Personal" };

export default async function StaffPage() {
  const context = await resolveAuthContext();
  const restaurantId = getDefaultRestaurantId(context);
  if (!restaurantId) redirect("/settings");

  if (!staffService.canManage(context, restaurantId)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Personal</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No tienes permiso para gestionar el personal de este restaurante.
        </CardContent>
      </Card>
    );
  }

  const snapshot = await staffService.getSnapshot(context, restaurantId);

  return (
    <StaffPanel snapshot={snapshot} currentUserId={context.userId} />
  );
}
