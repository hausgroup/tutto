import type { TableStatus } from "@/lib/floor/types";
import {
  CircleCheck,
  CircleDot,
  CircleOff,
  type LucideIcon,
  Utensils,
} from "lucide-react";

/** Salon UI shows only three states. */
export const SALON_STATES = ["free", "reserved", "occupied"] as const;
export type SalonState = (typeof SALON_STATES)[number];

/** Map internal operational status → salon Free / Reserved / Occupied. */
export function toSalonState(status: TableStatus): SalonState {
  switch (status) {
    case "reserved":
      return "reserved";
    case "occupied":
    case "order_ready":
    case "payment_pending":
      return "occupied";
    case "available":
    case "closed":
    default:
      return "free";
  }
}

/**
 * Floor display helper: an "occupied" table with no bill still shows as free.
 */
export function toSalonStateForBill(
  status: TableStatus,
  billTotalMinor?: number | null,
): SalonState {
  return toSalonState(effectiveOperationalStatus(status, billTotalMinor));
}

/** Clear empty occupied tickets for salon chrome (chairs, bar, surface). */
export function effectiveOperationalStatus(
  status: TableStatus,
  billTotalMinor?: number | null,
): TableStatus {
  if (status === "occupied" && (billTotalMinor == null || billTotalMinor <= 0)) {
    return "available";
  }
  return status;
}

/** Status values the floor editor can assign manually. */
export const SALON_EDITABLE_STATUSES = [
  "available",
  "reserved",
  "occupied",
] as const satisfies readonly TableStatus[];

export const SALON_STATE_META: Record<
  SalonState,
  {
    label: string;
    description: string;
    /** Internal status written when editing from the salon UI. */
    tableStatus: TableStatus;
    icon: LucideIcon;
    /** Tailwind classes for chair indicators. */
    accentClass: string;
    badgeClass: string;
  }
> = {
  free: {
    label: "Libre",
    description: "Lista para recibir clientes",
    tableStatus: "available",
    icon: CircleDot,
    // Mint pastel
    accentClass: "bg-[#A8E0CB] dark:bg-[#6FCBB0]",
    badgeClass:
      "border-[#A8E0CB]/60 text-[#3F8F74] dark:border-[#6FCBB0]/45 dark:text-[#A8E0CB]",
  },
  reserved: {
    label: "Reservada",
    description: "Reservación confirmada",
    tableStatus: "reserved",
    icon: CircleCheck,
    // Soft greyish yellow
    accentClass: "bg-[#E4DDB0] dark:bg-[#C5B87E]",
    badgeClass:
      "border-[#E4DDB0]/70 text-[#8A8050] dark:border-[#C5B87E]/45 dark:text-[#E4DDB0]",
  },
  occupied: {
    label: "Ocupada",
    description: "Con clientes en la mesa",
    tableStatus: "occupied",
    icon: Utensils,
    // Pastel pink / soft rose
    accentClass: "bg-[#F0B6C1] dark:bg-[#E48A9A]",
    badgeClass:
      "border-[#F0B6C1]/70 text-[#B85F70] dark:border-[#E48A9A]/45 dark:text-[#F0B6C1]",
  },
};

/** @deprecated Prefer SALON_STATE_META via toSalonState for floor UI. */
export const TABLE_STATUS_META: Record<
  TableStatus,
  {
    label: string;
    description: string;
    icon: LucideIcon;
    badgeClass: string;
    nodeClass: string;
  }
> = {
  available: {
    label: SALON_STATE_META.free.label,
    description: SALON_STATE_META.free.description,
    icon: SALON_STATE_META.free.icon,
    badgeClass: SALON_STATE_META.free.badgeClass,
    nodeClass: "border-border bg-card",
  },
  occupied: {
    label: SALON_STATE_META.occupied.label,
    description: SALON_STATE_META.occupied.description,
    icon: SALON_STATE_META.occupied.icon,
    badgeClass: SALON_STATE_META.occupied.badgeClass,
    nodeClass: "border-border bg-card",
  },
  order_ready: {
    label: SALON_STATE_META.occupied.label,
    description: "Pedido listo — se muestra como ocupada",
    icon: SALON_STATE_META.occupied.icon,
    badgeClass: SALON_STATE_META.occupied.badgeClass,
    nodeClass: "border-border bg-card",
  },
  payment_pending: {
    label: SALON_STATE_META.occupied.label,
    description: "Por cobrar — se muestra como ocupada",
    icon: SALON_STATE_META.occupied.icon,
    badgeClass: SALON_STATE_META.occupied.badgeClass,
    nodeClass: "border-border bg-card",
  },
  reserved: {
    label: SALON_STATE_META.reserved.label,
    description: SALON_STATE_META.reserved.description,
    icon: SALON_STATE_META.reserved.icon,
    badgeClass: SALON_STATE_META.reserved.badgeClass,
    nodeClass: "border-border bg-card",
  },
  closed: {
    label: "Cerrada",
    description: "Fuera de servicio",
    icon: CircleOff,
    badgeClass: "text-muted-foreground",
    nodeClass: "border-border bg-muted text-muted-foreground",
  },
};

export function needsAttention(status: TableStatus): boolean {
  return toSalonState(status) === "occupied";
}

export function getSalonMeta(status: TableStatus) {
  return SALON_STATE_META[toSalonState(status)];
}

export function getSalonMetaForBill(
  status: TableStatus,
  billTotalMinor?: number | null,
) {
  return SALON_STATE_META[toSalonStateForBill(status, billTotalMinor)];
}
