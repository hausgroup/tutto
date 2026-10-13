"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, PencilRuler } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FloorPlanView } from "@/components/floor/floor-plan-view";
import { PageHeaderActions } from "@/components/layout/page-header-actions";
import type { FloorBootstrap } from "@/lib/floor/actions-boot";
import {
  getCachedFloorBoot,
  getPendingFloorBoot,
  setCachedFloorBoot,
  refreshFloorBootInBackground,
  warmFloorBoot,
} from "@/lib/floor/client-cache";
function FloorChrome({ boot }: { boot: FloorBootstrap }) {
  const [reservePickActive, setReservePickActive] = useState(false);

  return (
    <div
      data-floor-chrome
      className="flex min-h-[calc(100dvh-7.5rem)] flex-col gap-3 md:min-h-[calc(100dvh-8.5rem)]"
    >
      <PageHeaderActions>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setReservePickActive((current) => !current)}
          >
            <CalendarCheck className="size-4" />
            {reservePickActive ? "Cancelar" : "Reservar"}
          </Button>
          {boot.canManage ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/floor/editor">
                <PencilRuler className="size-4" />
                Editar plano
              </Link>
            </Button>
          ) : null}
        </div>
      </PageHeaderActions>

      <FloorPlanView
        snapshot={boot.snapshot}
        billTotalsByTableId={boot.billTotalsByTableId}
        pendingBarDrinksByTableId={boot.pendingBarDrinksByTableId}
        reservePickActive={reservePickActive}
        onReservePickActiveChange={setReservePickActive}
        className="min-h-0 flex-1"
      />
    </div>
  );
}

export function FloorClientEntry() {
  const [boot, setBoot] = useState<FloorBootstrap | null>(() =>
    getCachedFloorBoot(),
  );
  useEffect(() => {
    let cancelled = false;

    const cached = getCachedFloorBoot();
    if (cached) {
      setBoot(cached);
      refreshFloorBootInBackground((fresh) => {
        if (!cancelled) {
          setCachedFloorBoot(fresh);
          setBoot(fresh);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    const pending = getPendingFloorBoot() ?? warmFloorBoot();
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

  return <FloorChrome boot={boot} />;
}
