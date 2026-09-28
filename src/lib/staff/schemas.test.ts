import { describe, expect, it } from "vitest";
import { staffInviteSchema, staffUpdateRoleSchema } from "@/lib/staff/schemas";

describe("staff schemas", () => {
  it("accepts a valid invite", () => {
    const parsed = staffInviteSchema.parse({
      restaurantId: "22222222-2222-4222-8222-222222222222",
      email: "ana@haus.local",
      fullName: "Ana Pérez",
      roleSlug: "staff",
    });
    expect(parsed.email).toBe("ana@haus.local");
  });

  it("rejects invalid role", () => {
    expect(() =>
      staffUpdateRoleSchema.parse({
        restaurantId: "22222222-2222-4222-8222-222222222222",
        membershipId: "44444444-4444-4444-8444-444444444401",
        roleSlug: "owner",
      }),
    ).toThrow();
  });
});
