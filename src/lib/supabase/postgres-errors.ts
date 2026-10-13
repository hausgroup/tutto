/** PostgREST / Postgres client error shape (not always `instanceof Error`). */
export type SupabaseLikeError = {
  code?: string | null;
  message?: string | null;
};

export function isUndefinedColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as SupabaseLikeError;
  return e.code === "42703";
}

export function staffHrMigrationHint(): string {
  return "database/migrations/20251013180000_staff_hr_fields.sql";
}
