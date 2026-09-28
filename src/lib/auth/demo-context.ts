import {
  PERMISSIONS,
  type AuthContext,
} from "@/lib/auth/permissions";
import { DEMO_RESTAURANT_ID } from "@/lib/floor/demo-data";

export function getDemoAuthContext(): AuthContext {
  return {
    userId: "00000000-0000-4000-8000-000000000001",
    email: "demo@haus.local",
    fullName: "Demo Admin",
    activeRestaurantId: DEMO_RESTAURANT_ID,
    memberships: [
      {
        id: "00000000-0000-4000-8000-000000000002",
        restaurantId: DEMO_RESTAURANT_ID,
        restaurantName: "Haus Demo",
        roleSlug: "admin",
        roleName: "Administrador",
        permissions: Object.values(PERMISSIONS),
      },
    ],
  };
}
