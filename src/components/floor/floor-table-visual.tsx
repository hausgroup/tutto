"use client";

import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSalonChairLayouts,
  getSalonTableSurfaceStyle,
} from "@/lib/floor/chair-layout";
import { getSalonMeta } from "@/lib/floor/status";
import {
  chairStatusClass,
  operationalTableSurfaceClass,
} from "@/lib/floor/operational-table-style";
import type { RestaurantTable } from "@/lib/floor/types";

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

export function FloorTableVisual({
  table,
  showStatusLabel = false,
  compact = false,
  selected = false,
}: {
  table: RestaurantTable;
  showStatusLabel?: boolean;
  compact?: boolean;
  selected?: boolean;
}) {
  const salon = getSalonMeta(table.status);
  const chairs = getSalonChairLayouts();
  const surface = getSalonTableSurfaceStyle();
  const surfaceClass = operationalTableSurfaceClass(table.status);
  const chairClass = chairStatusClass(table.status);

  return (
    <div
      className={cn(
        "relative size-full select-none rounded-[16px]",
        selected &&
          "bg-zinc-300/35 ring-1 ring-dashed ring-zinc-400/80 dark:bg-zinc-700/35 dark:ring-zinc-500",
      )}
    >
      {chairs.map((chair, index) => (
        <div
          key={`${table.id}-chair-${index}`}
          className="absolute"
          style={{
            left: `${chair.x}%`,
            top: `${chair.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <SalonChair
            edge={chair.edge ?? "top"}
            className={cn(
              chairClass,
              compact && "h-2 w-4 sm:h-2 sm:w-4",
            )}
          />
        </div>
      ))}

      <div
        className={cn(
          "absolute flex overflow-hidden",
          surface.inset,
          surface.className,
          surfaceClass,
        )}
      >
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col items-start justify-between",
            compact ? "gap-0.5 px-1.5 py-1.5" : "gap-1 px-2 py-2.5",
          )}
        >
          <div className="min-w-0 space-y-0.5">
            <p
              className={cn(
                "truncate font-semibold leading-none tracking-tight text-zinc-800 dark:text-zinc-100",
                compact ? "text-[10px]" : "text-sm",
              )}
            >
              {table.label}
            </p>
            {showStatusLabel ? (
              <p
                className={cn(
                  "truncate font-medium text-zinc-400 dark:text-zinc-500",
                  compact ? "text-[8px]" : "text-xs",
                )}
              >
                {salon.label}
              </p>
            ) : null}
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium text-zinc-500 dark:text-zinc-400",
              compact ? "text-[9px]" : "text-xs",
            )}
          >
            <Users
              className={cn(compact ? "size-2.5" : "size-3.5")}
              aria-hidden
            />
            {table.capacity}
          </span>
        </div>
      </div>
    </div>
  );
}
