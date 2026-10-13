"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileDown, Loader2 } from "lucide-react";
import { Button as ArcButton } from "@/components/arc/button/button";
import { Button } from "@/components/ui/button";
import { ReservationsCalendarView } from "@/components/reservations/reservations-calendar-view";
import { ReservationsListView } from "@/components/reservations/reservations-list-view";
import { PageHeaderActions } from "@/components/layout/page-header-actions";
import { PageStat, PageStatGrid } from "@/components/ui/page-stat";
import {
  buildReservationOverview,
  partitionReservationsByDay,
  reservationsForDay,
  tomorrowYmdInRestaurantZone,
  type ReservationOverviewItem,
} from "@/lib/floor/reservations-overview";
import { buildHostReservationsDayPdf } from "@/lib/floor/reservations-host-pdf";
import {
  downloadPdfBytes,
  slugForFilename,
} from "@/lib/floor/download-pdf";
import type { FloorSnapshot } from "@/lib/floor/types";
import { patchCachedFloorCancelReservation } from "@/lib/floor/client-cache";
import { cancelTableReservationAction } from "@/lib/orders/actions";

export type ReservationsViewMode = "list" | "calendar";

const VIEW_STORAGE_KEY = "haus-reservations-view";

const VIEW_OPTIONS: {
  id: ReservationsViewMode;
  label: string;
}[] = [
  { id: "list", label: "Todas" },
  { id: "calendar", label: "Calendario" },
];

export function ReservationsPanel({
  snapshot,
  restaurantName,
}: {
  snapshot: FloorSnapshot;
  restaurantName: string;
}) {
  const router = useRouter();
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [, startCancel] = useTransition();

  const all = useMemo(() => buildReservationOverview(snapshot), [snapshot]);
  const { today, upcoming, unscheduled } = useMemo(
    () => partitionReservationsByDay(all),
    [all],
  );
  const guestsTonight = today.reduce((sum, item) => sum + item.partySize, 0);

  const tomorrowYmd = tomorrowYmdInRestaurantZone();
  const tomorrowItems = useMemo(
    () => reservationsForDay(all, tomorrowYmd),
    [all, tomorrowYmd],
  );
  const tomorrowGuests = tomorrowItems.reduce(
    (sum, item) => sum + item.partySize,
    0,
  );

  const [view, setView] = useState<ReservationsViewMode>("list");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_STORAGE_KEY);
      if (stored === "list" || stored === "calendar") {
        setView(stored);
      } else if (stored === "day" || stored === "timeline") {
        setView("list");
      }
    } catch {
      /* ignore */
    }
  }, []);

  function handleCancelReservation(item: ReservationOverviewItem) {
    const tableId = item.tables[0]?.id;
    if (!tableId) return;
    setCancelingId(item.id);
    startCancel(async () => {
      const result = await cancelTableReservationAction({ tableId });
      setCancelingId(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      patchCachedFloorCancelReservation(tableId, item.groupId);
      router.refresh();
    });
  }

  function selectView(next: ReservationsViewMode) {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  async function exportTomorrowHostPdf() {
    setExportingPdf(true);
    try {
      const bytes = await buildHostReservationsDayPdf({
        restaurantName,
        ymd: tomorrowYmd,
        items: tomorrowItems,
      });
      const slug = slugForFilename(restaurantName) || "local";
      downloadPdfBytes(bytes, `reservas-${tomorrowYmd}-${slug}.pdf`);
      toast.success(
        tomorrowItems.length > 0
          ? "PDF de mañana descargado."
          : "PDF descargado (sin reservas para mañana).",
      );
    } catch {
      toast.error("No pudimos generar el PDF.");
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeaderActions>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={exportingPdf}
            onClick={() => void exportTomorrowHostPdf()}
          >
            {exportingPdf ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <FileDown className="size-4" aria-hidden />
            )}
            Compartir reservas
            {tomorrowItems.length > 0 ? (
              <span className="tabular-nums text-muted-foreground">
                {tomorrowItems.length}
              </span>
            ) : null}
          </Button>
        </div>
      </PageHeaderActions>

      <PageStatGrid columns={4}>
        <PageStat label="Hoy" value={today.length} hint={guestHint(guestsTonight)} />
        <PageStat
          label="Mañana"
          value={tomorrowItems.length}
          hint={guestHint(tomorrowGuests)}
        />
        <PageStat
          label="Próximos días"
          value={upcoming.length}
          hint="Después de mañana"
        />
        <PageStat
          label="Sin horario"
          value={unscheduled.length}
          hint="Falta la hora"
        />
      </PageStatGrid>

      <div className="flex flex-col gap-5">
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Vista de reservas"
        >
          {VIEW_OPTIONS.map((option) => (
            <ArcButton
              key={option.id}
              type="button"
              role="tab"
              aria-selected={view === option.id}
              variant={view === option.id ? "primary" : "secondary"}
              size="sm"
              onClick={() => selectView(option.id)}
            >
              {option.label}
            </ArcButton>
          ))}
        </div>

        <div role="tabpanel">
          {view === "list" ? (
            <ReservationsListView
              today={today}
              upcoming={upcoming}
              unscheduled={unscheduled}
              onCancel={handleCancelReservation}
              cancelingId={cancelingId}
            />
          ) : null}
          {view === "calendar" ? (
            <ReservationsCalendarView
              items={all}
              onCancel={handleCancelReservation}
              cancelingId={cancelingId}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function guestHint(count: number) {
  return count === 1 ? "1 comensal" : `${count} comensales`;
}

