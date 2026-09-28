import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthContext, PermissionSlug, RestaurantMembership } from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/lib/env";

type MembershipRow = {
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

function mapMembership(row: MembershipRow): RestaurantMembership {
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

export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileRow as {
    full_name: string;
    email: string;
  } | null;

  const { data: membershipRows, error: membershipError } = await supabase
    .from("restaurant_memberships")
    .select(
      `
      id,
      restaurant_id,
      restaurants ( name ),
      roles (
        slug,
        name,
        role_permissions (
          permissions ( slug )
        )
      )
    `,
    )
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (membershipError) {
    throw membershipError;
  }

  const memberships = (membershipRows ?? []).map((row) =>
    mapMembership(row as unknown as MembershipRow),
  );

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? "",
    memberships,
    activeRestaurantId: memberships[0]?.restaurantId ?? null,
  };
});

export async function requireAuthContext(): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context) {
    throw new Error("UNAUTHORIZED");
  }
  return context;
}
