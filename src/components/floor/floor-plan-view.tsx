"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FloorGridView } from "@/components/floor/floor-grid-view";
import { FloorMobileTableList } from "@/components/floor/floor-mobile-table-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { needsAttention } from "@/lib/floor/status";
import type { FloorSnapshot, RestaurantTable } from "@/lib/floor/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { warmPosCatalog, warmPosTable } from "@/lib/pos/client-cache";
import { cn } from "@/lib/utils";

function posHref(table: RestaurantTable) {
  return `/pos/${table.id}?t=${encodeURIComponent(table.label)}`;
}

export function FloorPlanView({
  snapshot,
  billTotalsByTableId = {},
  pendingBarDrinksByTableId = {},
  className,
}: {
  snapshot: FloorSnapshot;
  billTotalsByTableId?: Record<string, number>;
  pendingBarDrinksByTableId?: Record<string, true>;
  className?: string;
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [pending, startTransition] = useTransition();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [activeAreaId, setActiveAreaId] = useState(
    snapshot.areas[0]?.id ?? "",
  );

  const areas = useMemo(
    () => [...snapshot.areas].sort((a, b) => a.sortOrder - b.sortOrder),
    [snapshot.areas],
  );

  const tablesForArea = useMemo(
    () =>
      snapshot.tables.filter(
        (table) => table.floorAreaId === activeAreaId && table.isActive,
      ),
    [snapshot.tables, activeAreaId],
  );

  const attentionCount = tablesForArea.filter((table) => {
    const bill = billTotalsByTableId[table.id];
    const status =
      table.status === "occupied" && (bill == null || bill <= 0)
        ? "available"
        : table.status;
    return needsAttention(status);
  }).length;

  // Warm catalog + route JS as soon as the floor is visible.
  useEffect(() => {
    void warmPosCatalog();
    for (const table of snapshot.tables) {
      if (!table.isActive) continue;
      router.prefetch(posHref(table));
    }
  }, [router, snapshot.tables]);

  function warmTable(table: RestaurantTable) {
    void warmPosTable(table.id).catch(() => {
      /* prefetch — errors surface on open */
    });
    router.prefetch(posHref(table));
  }

  function openPos(table: RestaurantTable) {
    setOpeningId(table.id);
    // Start Supabase work BEFORE navigation so POS can paint from cache.
    void warmPosTable(table.id).catch(() => {
      /* POS entry shows toast if still failing */
    });
    const href = posHref(table);
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-3",
        (pending || openingId) && "cursor-progress",
        className,
      )}
    >
      <Tabs
        value={activeAreaId}
        onValueChange={setActiveAreaId}
        className="flex min-h-0 flex-1 flex-col gap-3"
      >
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-auto w-full justify-start sm:w-auto">
            {areas.map((area) => (
              <TabsTrigger key={area.id} value={area.id}>
                {area.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {attentionCount > 0 ? (
            <Badge variant="secondary" className="w-fit">
              {attentionCount} requieren atención
            </Badge>
          ) : null}
        </div>

        {areas.map((area) => (
          <TabsContent
            key={area.id}
            value={area.id}
            className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
          >
            {isMobile ? (
              <FloorMobileTableList
                tables={tablesForArea}
                onSelect={openPos}
                onWarm={warmTable}
                billTotalsByTableId={billTotalsByTableId}
                pendingBarDrinksByTableId={pendingBarDrinksByTableId}
                openingTableId={openingId}
              />
            ) : (
              <FloorGridView
                tables={tablesForArea}
                onSelect={openPos}
                onWarm={warmTable}
                billTotalsByTableId={billTotalsByTableId}
                pendingBarDrinksByTableId={pendingBarDrinksByTableId}
                openingTableId={openingId}
                className="min-h-[min(70vh,calc(100dvh-12rem))]"
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
