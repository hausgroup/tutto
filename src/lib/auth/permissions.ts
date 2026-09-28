export const PERMISSIONS = {
  RESTAURANT_SETTINGS_MANAGE: "restaurant.settings.manage",
  STAFF_MANAGE: "staff.manage",
  FLOOR_MANAGE: "floor.manage",
  PRODUCTS_MANAGE: "products.manage",
  INVENTORY_MANAGE: "inventory.manage",
  ORDERS_CREATE: "orders.create",
  ORDERS_VIEW: "orders.view",
  ORDERS_MODIFY: "orders.modify",
  ORDERS_VOID: "orders.void",
  PAYMENTS_PROCESS: "payments.process",
  CASHIER_MANAGE: "cashier.manage",
  REPORTS_VIEW: "reports.view",
  SIIGO_MANAGE: "siigo.manage",
  AUDIT_VIEW: "audit.view",
} as const;

export type PermissionSlug =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type RoleSlug = "admin" | "staff" | string;

export type RestaurantMembership = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  roleSlug: RoleSlug;
  roleName: string;
  permissions: PermissionSlug[];
};

export type AuthContext = {
  userId: string;
  email: string;
  fullName: string;
  memberships: RestaurantMembership[];
  activeRestaurantId: string | null;
};

export function membershipHasPermission(
  membership: RestaurantMembership,
  permission: PermissionSlug,
): boolean {
  return membership.permissions.includes(permission);
}

export function getActiveMembership(
  context: AuthContext,
  restaurantId?: string | null,
): RestaurantMembership | null {
  const targetId = restaurantId ?? context.activeRestaurantId;
  if (!targetId) return null;
  return (
    context.memberships.find((m) => m.restaurantId === targetId) ?? null
  );
}

export function requirePermission(
  context: AuthContext,
  permission: PermissionSlug,
  restaurantId?: string | null,
): void {
  const membership = getActiveMembership(context, restaurantId);
  if (!membership || !membershipHasPermission(membership, permission)) {
    throw new Error("FORBIDDEN");
  }
}
