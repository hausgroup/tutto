"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ACTIVE_RESTAURANT_COOKIE,
} from "@/lib/auth/active-restaurant";
import { revalidateRestaurantScopedPaths } from "@/lib/auth/revalidate-restaurant-scoped";
import { resolveAuthContext } from "@/lib/auth/resolve-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema } from "@/schemas/auth";
import { z } from "zod";

export type AuthActionState = {
  error?: string;
};

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Correo o contraseña inválidos." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      error:
        "No pudimos iniciar sesión. Verifica tus credenciales e intenta de nuevo.",
    };
  }

  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") ? next : "/floor");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const switchRestaurantSchema = z.object({
  restaurantId: z.string().uuid(),
});

export type SwitchRestaurantState = { error?: string };

export async function switchRestaurantAction(
  input: unknown,
): Promise<SwitchRestaurantState> {
  try {
    const { restaurantId } = switchRestaurantSchema.parse(input);
    const context = await resolveAuthContext();
    const allowed = context.memberships.some(
      (m) => m.restaurantId === restaurantId,
    );
    if (!allowed) {
      return { error: "No tienes acceso a ese restaurante." };
    }

    const jar = await cookies();
    jar.set(ACTIVE_RESTAURANT_COOKIE, restaurantId, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
    });

    revalidateRestaurantScopedPaths();

    return {};
  } catch {
    return { error: "No pudimos cambiar de restaurante." };
  }
}
