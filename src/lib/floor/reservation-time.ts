export const RESTAURANT_TIME_ZONE = "America/Bogota";
const UTC_OFFSET = "-05:00";

export function isoToLocalParts(iso: string): {
  dateYmd: string;
  timeHm: string;
} {
  const date = new Date(iso);
  const dateYmd = new Intl.DateTimeFormat("en-CA", {
    timeZone: RESTAURANT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const timeHm = new Intl.DateTimeFormat("en-GB", {
    timeZone: RESTAURANT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return { dateYmd, timeHm: timeHm.slice(0, 5) };
}

export function localPartsToIso(dateYmd: string, timeHm: string): string {
  return new Date(`${dateYmd}T${timeHm}:00${UTC_OFFSET}`).toISOString();
}

export function defaultReservationDateTime(): {
  dateYmd: string;
  timeHm: string;
} {
  const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
  return isoToLocalParts(inOneHour.toISOString());
}

export function formatReservationWhen(
  iso: string | null | undefined,
): string {
  if (!iso) return "Horario por confirmar";
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: RESTAURANT_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
