import { describe, expect, it } from "vitest";
import {
  calculateCashierDifference,
  calculateLineItem,
  sumOrderTotals,
} from "@/lib/orders/calculate";

describe("order calculations", () => {
  it("calculates line with tax", () => {
    const line = calculateLineItem({
      unitPriceMinor: 28000,
      quantity: 2,
      taxRateBps: 800,
      modifierDeltaMinor: 3000,
    });
    expect(line.lineSubtotalMinor).toBe(62000);
    expect(line.lineTaxMinor).toBe(4960);
    expect(line.lineTotalMinor).toBe(66960);
  });

  it("sums order totals", () => {
    const totals = sumOrderTotals([
      calculateLineItem({
        unitPriceMinor: 10000,
        quantity: 1,
        taxRateBps: 0,
      }),
      calculateLineItem({
        unitPriceMinor: 5000,
        quantity: 2,
        taxRateBps: 0,
      }),
    ]);
    expect(totals.subtotalMinor).toBe(20000);
    expect(totals.totalMinor).toBe(20000);
  });

  it("calculates cashier difference", () => {
    expect(calculateCashierDifference(100000, 99000)).toBe(-1000);
  });
});
