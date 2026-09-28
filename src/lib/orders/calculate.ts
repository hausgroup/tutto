import { applyTaxMinor } from "@/lib/utils/money";

export type LineTotals = {
  lineSubtotalMinor: number;
  lineTaxMinor: number;
  lineTotalMinor: number;
};

export function calculateLineItem(input: {
  unitPriceMinor: number;
  quantity: number;
  taxRateBps: number;
  modifierDeltaMinor?: number;
}): LineTotals {
  const unitMinor =
    input.unitPriceMinor + Math.max(0, input.modifierDeltaMinor ?? 0);
  const lineSubtotalMinor = unitMinor * input.quantity;
  const lineTaxMinor = applyTaxMinor(lineSubtotalMinor, input.taxRateBps);
  return {
    lineSubtotalMinor,
    lineTaxMinor,
    lineTotalMinor: lineSubtotalMinor + lineTaxMinor,
  };
}

export function sumOrderTotals(lines: LineTotals[]) {
  return lines.reduce(
    (acc, line) => ({
      subtotalMinor: acc.subtotalMinor + line.lineSubtotalMinor,
      taxMinor: acc.taxMinor + line.lineTaxMinor,
      totalMinor: acc.totalMinor + line.lineTotalMinor,
    }),
    { subtotalMinor: 0, taxMinor: 0, totalMinor: 0 },
  );
}

export function calculateCashierDifference(
  expectedCashMinor: number,
  actualCashMinor: number,
) {
  return actualCashMinor - expectedCashMinor;
}
