"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, PencilRuler } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FloorPlanView } from "@/components/floor/floor-plan-view";
import { PageHeaderActions } from "@/components/layout/page-header-actions";
import type { FloorBootstrap } from "@/lib/floor/actions-boot";
import { useActiveRestaurantId } from "@/lib/auth/active-restaurant-context";
import {
  getCachedFloorBoot,
  getPendingFloorBoot,
  prefetchFloorBoot,
  setCachedFloorBoot,
  refreshFloorBootInBackground,
  warmFloorBoot,
} from "@/lib/floor/client-cache";

function floorBootErrorMessage(code: string) {
  switch (code) {
    case "RESTAURANT_NOT_FOUND":
      return "No hay restaurante activo. Elige uno en el menú lateral.";
    case "BOOTSTRAP_FAILED":
      return "No pudimos cargar el salón.";
    default:
      return "No pudimos cargar el salón.";
  }
}

function FloorChrome({ boot }: { boot: FloorBootstrap }) {
  const restaurantId = useActiveRestaurantId();
  const [reservePickActive, setReservePickActive] = useState(false);

  return (
    <div
      data-floor-chrome
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
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
              <Link
                href="/floor/editor"
                onMouseEnter={() => prefetchFloorBoot(restaurantId)}
                onFocus={() => prefetchFloorBoot(restaurantId)}
              >
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

export function FloorClientEntry({
  restaurantId: serverRestaurantId,
}: {
  restaurantId: string;
}) {
  const restaurantId = useActiveRestaurantId();
  const [boot, setBoot] = useState<FloorBootstrap | null>(() =>
    getCachedFloorBoot(restaurantId) ?? getCachedFloorBoot(serverRestaurantId),
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function applyBoot(next: FloorBootstrap) {
      if (cancelled) return;
      setCachedFloorBoot(next);
      setBoot(next);
      setLoadError(null);
    }

    const cached = getCachedFloorBoot(restaurantId);
    if (cached) {
      applyBoot(cached);
      refreshFloorBootInBackground((fresh) => {
        if (
          !cancelled &&
          (fresh.snapshot.areas[0]?.restaurantId ??
            fresh.snapshot.tables[0]?.restaurantId) === restaurantId
        ) {
          applyBoot(fresh);
        }
      }, restaurantId);
      return () => {
        cancelled = true;
      };
    }

    setBoot(null);
    setLoadError(null);

    const pending =
      getPendingFloorBoot(restaurantId) ?? warmFloorBoot({ restaurantId });
    void pending
      .then((result) => {
        if (cancelled) return;
        const resultRestaurantId =
          result.snapshot.areas[0]?.restaurantId ??
          result.snapshot.tables[0]?.restaurantId;
        if (resultRestaurantId !== restaurantId) {
          return warmFloorBoot({ force: true, restaurantId }).then(applyBoot);
        }
        applyBoot(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (!getCachedFloorBoot(restaurantId)) {
          const code =
            error instanceof Error ? error.message : "BOOTSTRAP_FAILED";
          const message = floorBootErrorMessage(code);
          setLoadError(message);
          toast.error(message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  if (loadError && !boot) {
    return (
      <p className="rounded-2xl bg-card px-4 py-8 text-center text-sm text-muted-foreground ring-1 ring-border">
        {loadError}
      </p>
    );
  }

  if (!boot) {
    return (
      <div
        data-floor-chrome
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
      >
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="min-h-0 flex-1 animate-pulse rounded-[20px] bg-muted" />
      </div>
    );
  }

  const bootRestaurantId =
    boot.snapshot.areas[0]?.restaurantId ??
    boot.snapshot.tables[0]?.restaurantId;
  if (bootRestaurantId !== restaurantId) {
    return (
      <div
        data-floor-chrome
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
      >
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="min-h-0 flex-1 animate-pulse rounded-[20px] bg-muted" />
      </div>
    );
  }

  return <FloorChrome boot={boot} />;
}
