import {
  PERMISSIONS,
  type AuthContext,
  type RestaurantMembership,
} from "@/lib/auth/permissions";
import {
  resolveActiveRestaurantId,
} from "@/lib/auth/active-restaurant";
import { RESTAURANT_BRANDS } from "@/lib/restaurants/constants";

function demoMemberships(): RestaurantMembership[] {
  return RESTAURANT_BRANDS.map((brand, index) => ({
    id: `00000000-0000-4000-8000-0000000000${(10 + index).toString(16)}`,
    restaurantId: brand.id,
    restaurantName: brand.name,
    roleSlug: "admin",
    roleName: "Administrador",
    permissions: Object.values(PERMISSIONS),
  }));
}

export function getDemoAuthContext(
  cookieRestaurantId: string | null = null,
): AuthContext {
  const memberships = demoMemberships();
  return {
    userId: "00000000-0000-4000-8000-000000000001",
    email: "demo@haus.local",
    fullName: "Demo Admin",
    memberships,
    activeRestaurantId: resolveActiveRestaurantId(
      memberships,
      cookieRestaurantId,
    ),
  };
}
