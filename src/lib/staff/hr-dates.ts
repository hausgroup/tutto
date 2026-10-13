const TIME_ZONE = "America/Bogota";

export function formatStaffDate(isoOrYmd: string | null | undefined) {
  if (!isoOrYmd) return "—";
  const date = isoOrYmd.includes("T")
    ? new Date(isoOrYmd)
    : new Date(`${isoOrYmd}T12:00:00`);
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatBirthdayLabel(birthDateYmd: string | null | undefined) {
  if (!birthDateYmd) return "Sin registrar";
  const date = new Date(`${birthDateYmd}T12:00:00`);
  const formatted = new Intl.DateTimeFormat("es-CO", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "long",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Days until next birthday (0 = today). Null if no birth date. */
export function daysUntilNextBirthday(
  birthDateYmd: string,
  now = new Date(),
): number {
  const [, month, day] = birthDateYmd.split("-").map(Number);
  if (!month || !day) return 365;
  const year = now.getFullYear();
  let next = new Date(year, month - 1, day);
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    next = new Date(year + 1, month - 1, day);
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

export function hireDateFromMembership(
  hiredAt: string | null | undefined,
  joinedAt: string,
): string {
  if (hiredAt) return hiredAt;
  return joinedAt.slice(0, 10);
}
