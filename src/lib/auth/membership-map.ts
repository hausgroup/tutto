import type { PermissionSlug, RestaurantMembership } from "@/lib/auth/permissions";

export type MembershipRow = {
  id: string;
  restaurant_id: string;
  restaurants: { name: string } | { name: string }[] | null;
  roles: {
    slug: string;
    name: string;
    role_permissions: {
      permissions: { slug: string } | { slug: string }[] | null;
    }[];
  } | null;
};

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function mapMembershipRow(row: MembershipRow): RestaurantMembership {
  const restaurant = unwrapRelation(row.restaurants);
  const role = row.roles;
  const permissions = new Set<PermissionSlug>();

  role?.role_permissions?.forEach((rp) => {
    const permission = unwrapRelation(rp.permissions);
    if (permission?.slug) {
      permissions.add(permission.slug as PermissionSlug);
    }
  });

  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    restaurantName: restaurant?.name ?? "Restaurante",
    roleSlug: role?.slug ?? "staff",
    roleName: role?.name ?? "Personal",
    permissions: [...permissions],
  };
}
