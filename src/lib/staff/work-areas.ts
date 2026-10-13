export const STAFF_WORK_AREA_IDS = [
  "salon",
  "cocina",
  "barra",
  "caja",
  "administracion",
  "limpieza",
  "otro",
] as const;

export type StaffWorkAreaId = (typeof STAFF_WORK_AREA_IDS)[number];

export const STAFF_WORK_AREA_LABELS: Record<StaffWorkAreaId, string> = {
  salon: "Salón",
  cocina: "Cocina",
  barra: "Barra",
  caja: "Caja",
  administracion: "Administración",
  limpieza: "Limpieza",
  otro: "Otro",
};

export function workAreaLabel(
  workArea: StaffWorkAreaId | null | undefined,
): string {
  if (!workArea) return "Sin asignar";
  return STAFF_WORK_AREA_LABELS[workArea] ?? workArea;
}

export function normalizeWorkArea(
  value: string | null | undefined,
): StaffWorkAreaId | null {
  if (!value) return null;
  return STAFF_WORK_AREA_IDS.includes(value as StaffWorkAreaId)
    ? (value as StaffWorkAreaId)
    : null;
}
