"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import {
  getDefaultRestaurantId,
  resolveAuthContext,
} from "@/lib/auth/resolve-context";
import { staffService } from "@/lib/staff/service";
import {
  staffCancelInvitationSchema,
  staffInviteSchema,
  staffSetActiveSchema,
  staffUpdateHrSchema,
  staffUpdateInvitationSchema,
  staffUpdateRoleSchema,
} from "@/lib/staff/schemas";

export type StaffActionState = { ok?: boolean; error?: string };

function supabaseErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const record = error as { message?: string; code?: string };
  if (record.code === "42501") {
    return "No tienes permiso para actualizar este perfil. Ejecuta la migración database/migrations/20251013180000_staff_hr_fields.sql en Supabase.";
  }
  return record.message?.trim() || null;
}

function mapError(error: unknown): StaffActionState {
  if (error instanceof ZodError) {
    return { error: "Revisa los datos del formulario." };
  }
  const pgMessage = supabaseErrorMessage(error);
  if (pgMessage && !(error instanceof Error)) {
    return { error: pgMessage };
  }
  if (error instanceof Error) {
    switch (error.message) {
      case "FORBIDDEN":
        return { error: "No tienes permiso para gestionar personal." };
      case "MEMBER_EXISTS":
        return { error: "Esa persona ya pertenece al restaurante." };
      case "INVITE_EXISTS":
        return { error: "Ya hay una invitación pendiente para ese correo." };
      case "EMAIL_IN_USE":
        return { error: "Ese correo ya está en uso por otra cuenta." };
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
      case "STAFF_HR_MIGRATION_REQUIRED":
        return {
          error:
            "Faltan columnas de personal en la base de datos. Ejecuta la migración database/migrations/20251013180000_staff_hr_fields.sql en Supabase.",
        };
      default:
        return {
          error: supabaseErrorMessage(error) ?? error.message ?? "No pudimos completar la operación.",
        };
    }
  }
  return {
    error: supabaseErrorMessage(error) ?? "No pudimos completar la operación.",
  };
}

function revalidateStaff() {
  revalidatePath("/staff");
  revalidatePath("/settings");
}

export async function inviteStaffAction(input: {
  email: string;
  fullName: string;
  roleSlug: "admin" | "staff";
  workArea?: string | null;
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

export async function updateStaffHrAction(input: {
  membershipId: string;
  fullName: string;
  email: string;
  workArea: string | null;
  hiredAt?: string | null;
  birthDate?: string | null;
  phone?: string | null;
}): Promise<StaffActionState> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("FORBIDDEN");
    const parsed = staffUpdateHrSchema.parse({
      restaurantId,
      membershipId: input.membershipId,
      fullName: input.fullName,
      email: input.email,
      workArea: input.workArea,
      hiredAt: input.hiredAt ?? null,
      birthDate: input.birthDate ?? null,
      phone: input.phone ?? null,
    });
    await staffService.updateHr(context, {
      restaurantId: parsed.restaurantId,
      membershipId: parsed.membershipId,
      fullName: parsed.fullName,
      email: parsed.email,
      workArea: parsed.workArea,
      hiredAt: parsed.hiredAt ?? null,
      birthDate: parsed.birthDate ?? null,
      phone: parsed.phone ?? null,
    });
    revalidateStaff();
    return { ok: true };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateStaffInvitationAction(input: {
  invitationId: string;
  fullName: string;
  email: string;
}): Promise<StaffActionState> {
  try {
    const context = await resolveAuthContext();
    const restaurantId = getDefaultRestaurantId(context);
    if (!restaurantId) throw new Error("FORBIDDEN");
    const parsed = staffUpdateInvitationSchema.parse({
      restaurantId,
      invitationId: input.invitationId,
      fullName: input.fullName,
      email: input.email,
    });
    await staffService.updateInvitation(context, parsed);
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
