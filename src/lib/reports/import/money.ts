/** Parse COP amounts from CSV/XML (minor units or formatted pesos). */
export function parseMoneyToMinor(
  raw: string | undefined,
  preferMinor = false,
): number {
  if (!raw?.trim()) return 0;
  const cleaned = raw
    .trim()
    .replace(/\s/g, "")
    .replace(/\$/g, "")
    .replace(/COP/gi, "");

  if (/^-?\d+$/.test(cleaned)) {
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n < 0) return 0;
    return preferMinor ? n : n;
  }

  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const asFloat = Number(normalized);
  if (!Number.isFinite(asFloat) || asFloat < 0) return 0;
  if (preferMinor) return Math.round(asFloat);
  return Math.round(asFloat * 100) === asFloat && cleaned.includes(".")
    ? Math.round(asFloat * 100)
    : Math.round(asFloat);
}

export function parseQuantity(raw: string | undefined): number {
  if (!raw?.trim()) return 1;
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.round(n * 1000) / 1000;
}
