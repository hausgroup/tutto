import { describe, expect, it } from "vitest";
import { tableLayoutSchema } from "@/lib/floor/schemas";

describe("floor schemas", () => {
  it("validates table layout bounds", () => {
    const parsed = tableLayoutSchema.parse({
      id: "44444444-4444-4444-8444-444444444401",
      restaurantId: "22222222-2222-4222-8222-222222222222",
      posX: 100,
      posY: 80,
      width: 96,
      height: 88,
      rotationDeg: 15,
    });

    expect(parsed.rotationDeg).toBe(15);
  });

  it("rejects layouts outside the canvas", () => {
    expect(() =>
      tableLayoutSchema.parse({
        id: "44444444-4444-4444-8444-444444444401",
        restaurantId: "22222222-2222-4222-8222-222222222222",
        posX: 9999,
        posY: 0,
        width: 96,
        height: 88,
        rotationDeg: 0,
      }),
    ).toThrow();
  });
});
