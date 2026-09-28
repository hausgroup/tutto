import { describe, expect, it } from "vitest";
import {
  getChairLayouts,
  getSalonChairLayouts,
  getSalonTableSurfaceStyle,
} from "@/lib/floor/chair-layout";

describe("chair layout", () => {
  it("places one chair for capacity 1 circle", () => {
    expect(getChairLayouts(1, "circle")).toHaveLength(1);
  });

  it("matches capacity for square", () => {
    expect(getChairLayouts(4, "square")).toHaveLength(4);
  });

  it("matches capacity for rectangle", () => {
    expect(getChairLayouts(6, "rectangle")).toHaveLength(6);
  });

  it("salon illustration always uses four seats", () => {
    const chairs = getSalonChairLayouts();
    expect(chairs).toHaveLength(4);
    expect(chairs.filter((c) => c.edge === "top")).toHaveLength(2);
    expect(chairs.filter((c) => c.edge === "bottom")).toHaveLength(2);
  });

  it("salon surface uses 16px radius", () => {
    const surface = getSalonTableSurfaceStyle();
    expect(surface.className).toContain("rounded-[16px]");
  });
});
