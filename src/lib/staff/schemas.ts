import { z } from "zod";

export const staffInviteSchema = z.object({
  restaurantId: z.string().uuid(),
  email: z.string().trim().email().max(160),
  fullName: z.string().trim().min(1).max(120),
  roleSlug: z.enum(["admin", "staff"]),
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
