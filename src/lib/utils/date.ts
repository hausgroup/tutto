const BOGOTA_TZ = "America/Bogota";

/** Calendar date in Colombia (YYYY-MM-DD) for comparing “today”. */
export function calendarDateInBogota(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return date.toLocaleDateString("en-CA", { timeZone: BOGOTA_TZ });
}

export function isTodayInBogota(iso: string): boolean {
  return calendarDateInBogota(iso) === calendarDateInBogota(new Date());
}
