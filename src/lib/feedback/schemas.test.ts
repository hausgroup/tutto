import { describe, expect, it } from "vitest";
import { createTestFeedbackSchema } from "@/lib/feedback/schemas";

describe("createTestFeedbackSchema", () => {
  it("requires title and body", () => {
    const result = createTestFeedbackSchema.safeParse({
      restaurantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "  ",
      body: "detalle",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid input", () => {
    const result = createTestFeedbackSchema.parse({
      restaurantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      kind: "issue",
      title: "Bug en POS",
      body: "Al enviar pedido no imprime.",
      pagePath: "/pos/table-1",
    });
    expect(result.title).toBe("Bug en POS");
    expect(result.pagePath).toBe("/pos/table-1");
  });
});
