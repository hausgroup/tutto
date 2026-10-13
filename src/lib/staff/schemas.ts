import { z } from "zod";
import { STAFF_WORK_AREA_IDS } from "@/lib/staff/work-areas";

const workAreaSchema = z.enum(STAFF_WORK_AREA_IDS);

const optionalDateYmd = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
);

export const staffInviteSchema = z.object({
  restaurantId: z.string().uuid(),
  email: z.string().trim().email().max(160),
  fullName: z.string().trim().min(1).max(120),
  roleSlug: z.enum(["admin", "staff"]),
  workArea: workAreaSchema.nullable().optional(),
});

export const staffUpdateHrSchema = z.object({
  restaurantId: z.string().uuid(),
  membershipId: z.string().uuid(),
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  workArea: workAreaSchema.nullable(),
  hiredAt: optionalDateYmd,
  birthDate: optionalDateYmd,
  phone: z.string().trim().max(40).nullable().optional(),
});

export const staffUpdateInvitationSchema = z.object({
  restaurantId: z.string().uuid(),
  invitationId: z.string().uuid(),
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
});

export const staffUpdateRoleSchema = z.object({
  restaurantId: z.string().uuid(),
  membershipId: z.string().uuid(),
  roleSlug: z.enum(["admin", "staff"]),
});

export const staffSetActiveSchema = z.object({
  restaurantId: z.string().uuid(),
  membershipId: z.string().uuid(),
  isActive: z.boolean(),
});

export const staffCancelInvitationSchema = z.object({
  restaurantId: z.string().uuid(),
  invitationId: z.string().uuid(),
});
