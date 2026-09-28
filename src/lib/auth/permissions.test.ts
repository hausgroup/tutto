import { describe, expect, it } from "vitest";
import {
  getActiveMembership,
  membershipHasPermission,
  requirePermission,
  type AuthContext,
  PERMISSIONS,
} from "@/lib/auth/permissions";

const context: AuthContext = {
  userId: "user-1",
  email: "admin@haus.demo",
  fullName: "Admin Demo",
  activeRestaurantId: "rest-1",
  memberships: [
    {
      id: "m-1",
      restaurantId: "rest-1",
      restaurantName: "Haus Demo",
      roleSlug: "admin",
      roleName: "Administrador",
      permissions: [
        PERMISSIONS.ORDERS_CREATE,
        PERMISSIONS.STAFF_MANAGE,
      ],
    },
  ],
};

describe("permissions", () => {
  it("checks membership permissions", () => {
    expect(
      membershipHasPermission(
        context.memberships[0],
        PERMISSIONS.ORDERS_CREATE,
      ),
    ).toBe(true);
    expect(
      membershipHasPermission(
        context.memberships[0],
        PERMISSIONS.SIIGO_MANAGE,
      ),
    ).toBe(false);
  });

  it("resolves active membership", () => {
    expect(getActiveMembership(context)?.restaurantId).toBe("rest-1");
  });

  it("throws when permission missing", () => {
    expect(() =>
      requirePermission(context, PERMISSIONS.SIIGO_MANAGE),
    ).toThrow("FORBIDDEN");
  });
});
