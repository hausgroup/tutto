"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PencilRuler } from "lucide-react";
import { toast } from "sonner";
import { FloorPlanView } from "@/components/floor/floor-plan-view";
import { Button } from "@/components/ui/button";
import type { FloorBootstrap } from "@/lib/floor/actions-boot";
import {
  getCachedFloorBoot,
  getPendingFloorBoot,
  setCachedFloorBoot,
  warmFloorBoot,
} from "@/lib/floor/client-cache";
import { needsAttention } from "@/lib/floor/status";

function FloorChrome({
  boot,
  refreshing,
}: {
  boot: FloorBootstrap;
  refreshing?: boolean;
}) {
  const attention = boot.snapshot.tables.filter(
    (table) => table.isActive && needsAttention(table.status),
  ).length;

  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col gap-3 md:min-h-[calc(100dvh-8.5rem)]">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {attention > 0
            ? `${attention} mesa(s) requieren atención.`
            : "Todas las mesas en calma."}
          {refreshing ? (
            <span className="ml-2 text-xs opacity-60">Actualizando…</span>
          ) : null}
        </p>
        {boot.canManage ? (
          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link href="/floor/editor">
              <PencilRuler className="size-4" />
              Editar plano
            </Link>
          </Button>
        ) : null}
      </div>

      <FloorPlanView
        snapshot={boot.snapshot}
        billTotalsByTableId={boot.billTotalsByTableId}
        pendingBarDrinksByTableId={boot.pendingBarDrinksByTableId}
        className="min-h-0 flex-1"
      />
    </div>
  );
}

export function FloorClientEntry() {
  const [boot, setBoot] = useState<FloorBootstrap | null>(() =>
    getCachedFloorBoot(),
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Paint cache immediately; refresh in background.
    const hadCache = Boolean(getCachedFloorBoot());
    if (hadCache) setRefreshing(true);

    const pending = getPendingFloorBoot() ?? warmFloorBoot({ force: true });
    void pending
      .then((result) => {
        if (cancelled) return;
        setCachedFloorBoot(result);
        setBoot(result);
      })
      .catch(() => {
        if (!cancelled && !getCachedFloorBoot()) {
          toast.error("No pudimos cargar el salón.");
        }
      })
      .finally(() => {
        if (!cancelled) setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!boot) {
    return (
      <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col gap-3">
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="min-h-[min(70vh,calc(100dvh-12rem))] animate-pulse rounded-[20px] bg-muted" />
      </div>
    );
  }

  return <FloorChrome boot={boot} refreshing={refreshing} />;
}
