import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveAuthContext, getDefaultRestaurantId } from "@/lib/auth/resolve-context";
import { useMockReports } from "@/lib/env";
import { reportService } from "@/lib/orders/service";
import { getSiigoPendingCount } from "@/lib/siigo/sync-jobs";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";

export const metadata: Metadata = { title: "Reportes" };

export default async function ReportsPage() {
  const context = await resolveAuthContext();
  const restaurantId = getDefaultRestaurantId(context);
  if (!restaurantId) redirect("/settings");

  const reports = await reportService.getRestaurantReports(
    context,
    restaurantId,
  );
  const siigoPending = await getSiigoPendingCount(restaurantId);

  return (
    <ReportsDashboard
      reports={reports}
      siigoPending={siigoPending}
      isMock={useMockReports()}
    />
  );
}
