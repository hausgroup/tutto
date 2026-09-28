"use server";

import { revalidatePath } from "next/cache";
import {
  getDefaultRestaurantId,
  resolveAuthContext,
} from "@/lib/auth/resolve-context";
import { staffService } from "@/lib/staff/service";
import {
  staffCancelInvitationSchema,
  staffInviteSchema,
  staffSetActiveSchema,
  staffUpdateRoleSchema,
} from "@/lib/staff/schemas";

export type StaffActionState = { ok?: boolean; error?: string };

function mapError(error: unknown): StaffActionState {
  if (error instanceof Error) {
    switch (error.message) {
      case "FORBIDDEN":
        return { error: "No tienes permiso para gestionar personal." };
      case "MEMBER_EXISTS":
        return { error: "Esa persona ya pertenece al restaurante." };
      case "INVITE_EXISTS":
        return { error: "Ya hay una invitación pendiente para ese correo." };
      case "LAST_ADMIN":
        return {
          error: "Debe quedar al menos un administrador activo.",
        };
      case "CANNOT_DEACTIVATE_SELF":
        return { error: "No puedes desactivar tu propia cuenta." };
      case "MEMBER_NOT_FOUND":
        return { error: "Miembro no encontrado." };
      case "INVITE_NOT_FOUND":
        return { error: "Invitación no encontrada." };
      case "ROLE_NOT_FOUND":
        return { error: "Rol no válido." };
      default:
        return { error: "No pudimos completar la operación." };
    }
  }
  return { error: "No pudimos completar la operación." };
}

function revalidateStaff() {
  revalidatePath("/staff");
  revalidatePath("/settings");
}

export async function inviteStaffAction(input: {
  email: string;
  fullName: string;
  roleSlug: "admin" | "staff";
}): Promise<StaffActionState> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("FORBIDDEN");
    const parsed = staffInviteSchema.parse({
      restaurantId,
      ...input,
    });
    await staffService.invite(context, parsed);
    revalidateStaff();
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateStaffRoleAction(input: {
  membershipId: string;
  roleSlug: "admin" | "staff";
}): Promise<StaffActionState> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("FORBIDDEN");
    const parsed = staffUpdateRoleSchema.parse({
      restaurantId,
      ...input,
    });
    await staffService.updateRole(context, parsed);
    revalidateStaff();
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function setStaffActiveAction(input: {
  membershipId: string;
  isActive: boolean;
}): Promise<StaffActionState> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("FORBIDDEN");
    const parsed = staffSetActiveSchema.parse({
      restaurantId,
      ...input,
    });
    await staffService.setActive(context, parsed);
    revalidateStaff();
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function cancelStaffInvitationAction(
  invitationId: string,
): Promise<StaffActionState> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("FORBIDDEN");
    const parsed = staffCancelInvitationSchema.parse({
      restaurantId,
      invitationId,
    });
    await staffService.cancelInvitation(context, parsed);
    revalidateStaff();
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}
