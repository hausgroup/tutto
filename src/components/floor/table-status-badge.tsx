import { cn } from "@/lib/utils";
import { getSalonMeta } from "@/lib/floor/status";
import type { TableStatus } from "@/lib/floor/types";
import { Badge } from "@/components/ui/badge";

export function TableStatusBadge({
  status,
  className,
}: {
  status: TableStatus;
  className?: string;
}) {
  const meta = getSalonMeta(status);
  const Icon = meta.icon;

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-normal", meta.badgeClass, className)}
    >
      <span className={cn("size-2 rounded-full", meta.accentClass)} aria-hidden />
      <Icon className="size-3.5" aria-hidden />
      {meta.label}
    </Badge>
  );
}
