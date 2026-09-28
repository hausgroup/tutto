import { cache } from "react";
import {
  PERMISSIONS,
  type AuthContext,
} from "@/lib/auth/permissions";
import { getDemoAuthContext } from "@/lib/auth/demo-context";
import { getAuthContext, requireAuthContext } from "@/lib/auth/session";
import { canUseDemoExperience } from "@/lib/env";

/** Deduped per request — layout + page share one auth round-trip. */
export const resolveAuthContext = cache(async (): Promise<AuthContext> => {
  if (canUseDemoExperience()) {
    return getDemoAuthContext();
  }
  return requireAuthContext();
});

export const resolveOptionalAuthContext = cache(
  async (): Promise<AuthContext | null> => {
    if (canUseDemoExperience()) {
      return getDemoAuthContext();
    }
    return getAuthContext();
  },
);

export function getDefaultRestaurantId(context: AuthContext): string | null {
  return context.activeRestaurantId ?? context.memberships[0]?.restaurantId ?? null;
}

export function contextHasAdminFloorAccess(context: AuthContext): boolean {
  return context.memberships.some((membership) =>
    membership.permissions.includes(PERMISSIONS.FLOOR_MANAGE),
  );
}
