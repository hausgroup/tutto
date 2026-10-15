"use client";

import type { CSSProperties } from "react";
import { Check, Users, Wine } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSalonChairLayouts,
  getSalonTableSurfaceStyle,
  type ChairLayout,
} from "@/lib/floor/chair-layout";
import { effectiveOperationalStatus, getSalonMeta } from "@/lib/floor/status";
import {
  chairStatusClass,
  operationalTableSurfaceClass,
} from "@/lib/floor/operational-table-style";
import type { RestaurantTable, TableStatus } from "@/lib/floor/types";
import { formatCurrency } from "@/lib/utils/money";

export const DRAG_MIME = "application/x-haus-table-id";

function showsOpenBill(status: TableStatus) {
  return (
    status === "occupied" ||
    status === "order_ready" ||
    status === "payment_pending"
  );
}

function SalonChair({
  edge,
  className,
}: {
  edge: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "h-2.5 w-5 sm:h-3 sm:w-6",
        edge === "top" && "rounded-t-full",
        edge === "bottom" && "rounded-b-full",
        edge === "left" && "h-5 w-2.5 rounded-l-full sm:h-6 sm:w-3",
        edge === "right" && "h-5 w-2.5 rounded-r-full sm:h-6 sm:w-3",
        className,
      )}
    />
  );
}

const NEUTRAL_ACCENT = "bg-zinc-300 dark:bg-zinc-600";

function salonChairAnchorStyle(chair: ChairLayout): CSSProperties {
  const edge = chair.edge ?? "top";
  const base = { left: `${chair.x}%`, top: `${chair.y}%` };
  switch (edge) {
    case "top":
      return { ...base, transform: "translate(-50%, -100%)" };
    case "bottom":
      return { ...base, transform: "translate(-50%, 0)" };
    case "left":
      return { ...base, transform: "translate(0, -50%)" };
    case "right":
      return { ...base, transform: "translate(-100%, -50%)" };
    default:
      return { ...base, transform: "translate(-50%, -50%)" };
  }
}

export function FloorTableSlot({
  table,
  onSelect,
  onWarm,
  /** Checkmark on the white table surface (reserve pick or plan editor). */
  reservePickSelected = false,
  allowInactive = false,
  draggable = false,
  isDragging = false,
  billTotalMinor,
  pendingBarDrinks = false,
  busy = false,
  /** Layout editor: ignore operational status — chairs/bar stay grey. */
  neutralAppearance = false,
  className,
}: {
  table: RestaurantTable;
  onSelect?: (table: RestaurantTable) => void;
  onWarm?: (table: RestaurantTable) => void;
  reservePickSelected?: boolean;
  allowInactive?: boolean;
  draggable?: boolean;
  isDragging?: boolean;
  billTotalMinor?: number | null;
  /** Open ticket has bar items not yet delivered to the table. */
  pendingBarDrinks?: boolean;
  busy?: boolean;
  neutralAppearance?: boolean;
  className?: string;
}) {
  const displayStatus = effectiveOperationalStatus(
    table.status,
    billTotalMinor,
  );
  const salon = getSalonMeta(displayStatus);
  const surfaceClass = operationalTableSurfaceClass(
    neutralAppearance ? "available" : displayStatus,
  );
  const chairClass = neutralAppearance
    ? NEUTRAL_ACCENT
    : chairStatusClass(displayStatus);
  const surface = getSalonTableSurfaceStyle();
  const chairs = getSalonChairLayouts();
  const disabled = !table.isActive && !allowInactive;
  const showPendingDrinks =
    !neutralAppearance && pendingBarDrinks && !disabled;
  const showBill =
    !neutralAppearance &&
    showsOpenBill(displayStatus) &&
    billTotalMinor != null &&
    billTotalMinor > 0;

  return (
    <button
      type="button"
      disabled={disabled}
      draggable={draggable && !disabled}
      onPointerEnter={() => {
        if (disabled) return;
        onWarm?.(table);
      }}
      onPointerDown={() => {
        if (disabled) return;
        onWarm?.(table);
      }}
      onClick={() => onSelect?.(table)}
      onDragStart={(event) => {
        if (!draggable || disabled) return;
        event.dataTransfer.setData(DRAG_MIME, table.id);
        event.dataTransfer.setData("text/plain", table.id);
        event.dataTransfer.effectAllowed = "move";
        onSelect?.(table);
      }}
      className={cn(
        "group relative flex aspect-square size-full items-stretch justify-center",
        "rounded-[16px] p-0 text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        draggable && !disabled && "cursor-grab active:cursor-grabbing",
        !draggable && !disabled && !busy && "cursor-pointer",
        disabled && "cursor-not-allowed opacity-40",
        busy && "cursor-progress opacity-70",
        isDragging && "opacity-40",
        className,
      )}
      aria-label={
        neutralAppearance
          ? `Mesa ${table.label}, capacidad ${table.capacity}${
              reservePickSelected ? ", seleccionada" : ""
            }`
          : `Mesa ${table.label}, ${salon.label}, capacidad ${table.capacity}${
              reservePickSelected ? ", seleccionada para reservar" : ""
            }${showBill ? `, cuenta ${formatCurrency(billTotalMinor)}` : ""}${
              showPendingDrinks ? ", bebidas pendientes de entregar" : ""
            }`
      }
      aria-busy={busy}
      aria-pressed={reservePickSelected}
    >
      <div className="relative size-full select-none">
        {chairs.map((chair, index) => (
          <div
            key={`${table.id}-chair-${index}`}
            className="absolute"
            style={salonChairAnchorStyle(chair)}
          >
            <SalonChair edge={chair.edge ?? "top"} className={chairClass} />
          </div>
        ))}

        <div
          className={cn(
            "absolute flex origin-center overflow-hidden transition-transform duration-200 ease-out motion-reduce:transition-none",
            surface.inset,
            surface.className,
            surfaceClass,
            !disabled &&
              !busy &&
              "[@media(hover:hover)]:group-hover:scale-[1.04] group-active:scale-[0.98]",
          )}
        >
          {showPendingDrinks ? (
            <span
              className="absolute right-1.5 top-1.5 z-[5] flex size-5 items-center justify-center rounded-full bg-zinc-200/90 text-zinc-500 dark:bg-zinc-600/40 dark:text-zinc-400"
              title="Bebidas pendientes de entregar"
            >
              <Wine className="size-3" aria-hidden />
              <span className="sr-only">Bebidas pendientes de entregar</span>
            </span>
          ) : null}
          {reservePickSelected ? (
            <span
              className="absolute right-2 top-2 z-10 flex size-6 items-center justify-center rounded-md border-2 border-primary bg-primary text-primary-foreground shadow-sm"
              aria-hidden
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col items-start justify-between gap-1 px-2 py-2.5 sm:px-3 sm:py-3">
            <div className="min-w-0 space-y-1">
              <div className="flex w-full items-start justify-between gap-1">
                <p className="truncate text-sm font-semibold leading-none tracking-tight text-zinc-800 dark:text-zinc-100">
                  {table.label}
                </p>
              </div>
              {!neutralAppearance ? (
                <p className="truncate text-xs font-medium leading-tight text-zinc-400 dark:text-zinc-500">
                  {displayStatus === "reserved" && table.reservation
                    ? table.reservation.guestName
                    : salon.label}
                </p>
              ) : null}
            </div>

            <div className="flex w-full min-w-0 items-end justify-between gap-1">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <Users className="size-3.5 shrink-0" aria-hidden />
                {table.capacity}
              </span>
              {showBill ? (
                <span className="truncate text-[11px] font-medium tabular-nums text-zinc-400 dark:text-zinc-500">
                  {formatCurrency(billTotalMinor)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
