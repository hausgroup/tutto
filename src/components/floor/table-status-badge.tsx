import { Badge, type BadgeTone } from "@/components/arc/badge/badge";
import { getSalonMeta, toSalonState } from "@/lib/floor/status";
import type { TableStatus } from "@/lib/floor/types";

function salonBadgeTone(status: TableStatus): BadgeTone {
  switch (toSalonState(status)) {
    case "free":
      return "success";
    case "reserved":
      return "warning";
    case "occupied":
      return "neutral";
  }
}

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
      tone={salonBadgeTone(status)}
      size="sm"
      icon={<Icon className="size-3.5" aria-hidden />}
      className={className}
    >
      {meta.label}
    </Badge>
  );
}
