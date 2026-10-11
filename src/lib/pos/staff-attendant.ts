const LAST_STAFF_KEY = "haus:pos:last-staff-name";
const TABLE_STAFF_PREFIX = "haus:pos:staff:";

export function readLastStaffName(): string {
  try {
    return localStorage.getItem(LAST_STAFF_KEY) ?? "";
  } catch {
    return "";
  }
}

export function persistStaffNameForTable(tableId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    localStorage.setItem(LAST_STAFF_KEY, trimmed);
    sessionStorage.setItem(`${TABLE_STAFF_PREFIX}${tableId}`, trimmed);
  } catch {
    /* ignore */
  }
}

export function readStaffNameForTable(tableId: string): string | null {
  try {
    return sessionStorage.getItem(`${TABLE_STAFF_PREFIX}${tableId}`);
  } catch {
    return null;
  }
}
