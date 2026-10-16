import { cache } from "react";
import {
  readActiveRestaurantCookie,
  resolveActiveRestaurantId,
} from "@/lib/auth/active-restaurant";
import { mapMembershipRow, type MembershipRow } from "@/lib/auth/membership-map";
import type { AuthContext } from "@/lib/auth/permissions";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const [{ data: profileRow }, { data: membershipRows, error: membershipError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
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
        .eq("is_active", true),
    ]);

  if (membershipError) {
    throw membershipError;
  }

  const profile = profileRow as {
    full_name: string;
    email: string;
  } | null;

  const memberships = (membershipRows ?? []).map((row) =>
    mapMembershipRow(row as unknown as MembershipRow),
  );

  const cookieRestaurantId = await readActiveRestaurantCookie();

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? "",
    memberships,
    activeRestaurantId: resolveActiveRestaurantId(
      memberships,
      cookieRestaurantId,
    ),
  };
});

export async function requireAuthContext(): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context) {
    throw new Error("UNAUTHORIZED");
  }
  return context;
}
