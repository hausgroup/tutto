import type { TableStatus } from "@/lib/floor/types";
import { getSalonMeta, toSalonState } from "@/lib/floor/status";
import { cn } from "@/lib/utils";

export function chairStatusClass(status: TableStatus): string {
  if (status === "closed") {
    return "bg-zinc-300 opacity-50 dark:bg-zinc-600";
  }
  return getSalonMeta(status).accentClass;
}

/** White elevated card — status lives in chair colour. */
export function operationalTableSurfaceClass(status: TableStatus): string {
  const salon = toSalonState(status);
  void salon;

  if (status === "closed") {
    return cn(
      "border-transparent bg-zinc-100 text-muted-foreground",
      "dark:bg-zinc-800/80",
    );
  }

  return cn(
    "border-transparent bg-white text-zinc-800",
    "shadow-[0_4px_16px_rgba(15,23,42,0.08)]",
    "dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-[0_4px_16px_rgba(0,0,0,0.35)]",
  );
}
