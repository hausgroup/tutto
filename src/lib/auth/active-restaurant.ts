import { cookies } from "next/headers";
import type { RestaurantMembership } from "@/lib/auth/permissions";
import { RESTAURANT_IDS } from "@/lib/restaurants/constants";

export const ACTIVE_RESTAURANT_COOKIE = "haus_active_restaurant_id";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function readActiveRestaurantCookie(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(ACTIVE_RESTAURANT_COOKIE)?.value?.trim();
  if (!raw || !UUID_RE.test(raw)) return null;
  return raw;
}

/** Pick active restaurant from cookie when the user is a member; else first membership by name. */
export function resolveActiveRestaurantId(
  memberships: RestaurantMembership[],
  cookieRestaurantId: string | null,
): string | null {
  if (memberships.length === 0) return null;

  if (
    cookieRestaurantId &&
    memberships.some((m) => m.restaurantId === cookieRestaurantId)
  ) {
    return cookieRestaurantId;
  }

  const preferred = memberships.find(
    (m) => m.restaurantId === RESTAURANT_IDS.ciao,
  );
  if (preferred) return preferred.restaurantId;

  const sorted = [...memberships].sort((a, b) =>
    a.restaurantName.localeCompare(b.restaurantName, "es"),
  );
  return sorted[0]?.restaurantId ?? null;
}
