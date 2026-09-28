const DEFAULT_LOCALE = "es-CO";
const DEFAULT_CURRENCY = "COP";

export function formatCurrency(
  amountMinor: number,
  options?: {
    currency?: string;
    locale?: string;
  },
): string {
  const currency = options?.currency ?? DEFAULT_CURRENCY;
  const locale = options?.locale ?? DEFAULT_LOCALE;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountMinor);
}

/**
 * Format a peso amount for editable COP inputs.
 * Thousands use `.`, decimals use `,` (es-CO).
 */
export function formatCopInput(
  amount: number,
  options?: { fractionDigits?: number },
): string {
  if (!Number.isFinite(amount)) return "";
  const fractionDigits = options?.fractionDigits ?? 0;
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
    useGrouping: true,
  }).format(amount);
}

/**
 * Parse a COP-styled input string into a number.
 * Accepts `1.500.000`, `1500000`, `1.500,50`.
 */
export function parseCopInput(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;

  const cleaned = trimmed.replace(/[^\d.,]/g, "");
  if (!cleaned) return 0;

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized: string;
  if (hasComma) {
    // Dots are thousands; comma is decimal.
    normalized = cleaned.replaceAll(".", "").replace(",", ".");
    // Extra commas → strip
    const parts = normalized.split(".");
    if (parts.length > 2) {
      normalized = `${parts[0]}.${parts.slice(1).join("")}`;
    }
  } else if (hasDot) {
    const parts = cleaned.split(".");
    // Multiple dots → thousand separators only.
    if (parts.length > 2) {
      normalized = cleaned.replaceAll(".", "");
    } else if ((parts[1]?.length ?? 0) > 2) {
      // Likely thousands without grouping clarity (e.g. 1500.000)
      normalized = cleaned.replaceAll(".", "");
    } else {
      // Ambiguous single dot with 1–2 decimals — treat as decimal.
      normalized = cleaned;
    }
  } else {
    normalized = cleaned;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Reformat raw keystrokes into a COP display string while typing.
 * Integer groups with `.`; optional decimals after `,`.
 */
export function maskCopInput(raw: string, maxFractionDigits = 2): string {
  if (!raw.trim()) return "";

  // Drop typed thousand-dots; we re-apply grouping. Keep commas as decimals.
  let text = raw.replace(/[^\d.,]/g, "").replaceAll(".", "");

  const commaIndex = text.indexOf(",");
  let intDigits: string;
  let fracDigits = "";
  let keepComma = false;

  if (commaIndex === -1) {
    intDigits = text.replace(/\D/g, "");
  } else {
    keepComma = true;
    intDigits = text.slice(0, commaIndex).replace(/\D/g, "");
    fracDigits = text
      .slice(commaIndex + 1)
      .replace(/\D/g, "")
      .slice(0, maxFractionDigits);
  }

  if (!intDigits && !keepComma) return "";

  const grouped = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(intDigits ? Number(intDigits) : 0);

  if (keepComma) return `${grouped},${fracDigits}`;
  return grouped;
}

export function addMinor(a: number, b: number): number {
  return a + b;
}

export function multiplyMinor(unitMinor: number, quantity: number): number {
  return unitMinor * quantity;
}

export function applyTaxMinor(amountMinor: number, taxRateBps: number): number {
  return Math.round((amountMinor * taxRateBps) / 10_000);
}
