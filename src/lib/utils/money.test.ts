import { describe, expect, it } from "vitest";
import { formatCopInput, maskCopInput, parseCopInput } from "@/lib/utils/money";

describe("COP input masking", () => {
  it("groups thousands with dots while typing", () => {
    expect(maskCopInput("1")).toBe("1");
    expect(maskCopInput("15")).toBe("15");
    expect(maskCopInput("150")).toBe("150");
    expect(maskCopInput("1500")).toBe("1.500");
    expect(maskCopInput("15000")).toBe("15.000");
    expect(maskCopInput("1500000")).toBe("1.500.000");
  });

  it("keeps decimal commas", () => {
    expect(maskCopInput("1500,")).toBe("1.500,");
    expect(maskCopInput("1500,5")).toBe("1.500,5");
    expect(maskCopInput("1500,50")).toBe("1.500,50");
    expect(maskCopInput("1500,509")).toBe("1.500,50");
  });

  it("parses grouped and decimal strings", () => {
    expect(parseCopInput("1.500.000")).toBe(1_500_000);
    expect(parseCopInput("1.500,50")).toBe(1500.5);
    expect(parseCopInput("1500")).toBe(1500);
  });

  it("formats values for display", () => {
    expect(formatCopInput(1500000)).toBe("1.500.000");
    expect(formatCopInput(1500.5, { fractionDigits: 2 })).toBe("1.500,5");
  });
});
