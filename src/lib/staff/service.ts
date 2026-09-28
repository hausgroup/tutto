import { randomUUID } from "node:crypto";
import { canUseDemoExperience } from "@/lib/env";
import { getDemoRestaurantStore } from "@/lib/demo/restaurant-store";
import {
  getActiveMembership,
  PERMISSIONS,
  requirePermission,
  type AuthContext,
} from "@/lib/auth/permissions";
import * as staffDb from "@/lib/staff/supabase-repository";
import type {
  StaffMember,
  StaffRoleSlug,
  StaffSnapshot,
} from "@/lib/staff/types";

function assertCanManage(context: AuthContext, restaurantId: string) {
  requirePermission(context, PERMISSIONS.STAFF_MANAGE, restaurantId);
}

function countActiveAdmins(members: StaffMember[]) {
  return members.filter((m) => m.isActive && m.roleSlug === "admin").length;
}

export const staffService = {
  async getSnapshot(
    context: AuthContext,
    restaurantId: string,
  ): Promise<StaffSnapshot> {
    assertCanManage(context, restaurantId);

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      return structuredClone({
        members: store.staffMembers.filter(
          (m) => m.restaurantId === restaurantId,
        ),
        invitations: store.staffInvitations.filter(
          (i) => i.restaurantId === restaurantId && i.status === "pending",
        ),
        roles: store.staffRoles,
      });
    }

    return staffDb.fetchStaffSnapshot(restaurantId);
  },

  async invite(
    context: AuthContext,
    input: {
      restaurantId: string;
      email: string;
      fullName: string;
      roleSlug: StaffRoleSlug;
    },
  ) {
    assertCanManage(context, input.restaurantId);
    const email = input.email.trim().toLowerCase();

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      if (
        store.staffMembers.some(
          (m) =>
            m.restaurantId === input.restaurantId &&
            m.email.toLowerCase() === email,
        )
      ) {
        throw new Error("MEMBER_EXISTS");
      }
      if (
        store.staffInvitations.some(
          (i) =>
            i.restaurantId === input.restaurantId &&
            i.email === email &&
            i.status === "pending",
        )
      ) {
        throw new Error("INVITE_EXISTS");
      }

      const role = store.staffRoles.find((r) => r.slug === input.roleSlug);
      if (!role) throw new Error("ROLE_NOT_FOUND");

      // Demo: create member immediately (no real email invite)
      const member: StaffMember = {
        membershipId: randomUUID(),
        userId: randomUUID(),
        restaurantId: input.restaurantId,
        email,
        fullName: input.fullName.trim(),
        roleSlug: role.slug,
        roleName: role.name,
        roleId: role.id,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      store.staffMembers.push(member);
      return { kind: "member" as const, email };
    }

    return staffDb.inviteOrLinkMember({
      ...input,
      email,
      invitedBy: context.userId,
    });
  },

  async updateRole(
    context: AuthContext,
    input: {
      restaurantId: string;
      membershipId: string;
      roleSlug: StaffRoleSlug;
    },
  ) {
    assertCanManage(context, input.restaurantId);

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const member = store.staffMembers.find(
        (m) =>
          m.membershipId === input.membershipId &&
          m.restaurantId === input.restaurantId,
      );
      if (!member) throw new Error("MEMBER_NOT_FOUND");

      if (
        member.roleSlug === "admin" &&
        input.roleSlug !== "admin" &&
        countActiveAdmins(store.staffMembers) <= 1
      ) {
        throw new Error("LAST_ADMIN");
      }

      const role = store.staffRoles.find((r) => r.slug === input.roleSlug);
      if (!role) throw new Error("ROLE_NOT_FOUND");
      member.roleSlug = role.slug;
      member.roleName = role.name;
      member.roleId = role.id;
      return;
    }

    const snapshot = await staffDb.fetchStaffSnapshot(input.restaurantId);
    const member = snapshot.members.find(
      (m) => m.membershipId === input.membershipId,
    );
    if (!member) throw new Error("MEMBER_NOT_FOUND");
    if (
      member.roleSlug === "admin" &&
      input.roleSlug !== "admin" &&
      countActiveAdmins(snapshot.members) <= 1
    ) {
      throw new Error("LAST_ADMIN");
    }

    await staffDb.updateMembershipRole(input);
  },

  async setActive(
    context: AuthContext,
    input: {
      restaurantId: string;
      membershipId: string;
      isActive: boolean;
    },
  ) {
    assertCanManage(context, input.restaurantId);

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const member = store.staffMembers.find(
        (m) =>
          m.membershipId === input.membershipId &&
          m.restaurantId === input.restaurantId,
      );
      if (!member) throw new Error("MEMBER_NOT_FOUND");

      if (
        !input.isActive &&
        member.roleSlug === "admin" &&
        countActiveAdmins(store.staffMembers) <= 1
      ) {
        throw new Error("LAST_ADMIN");
      }

      if (member.userId === context.userId && !input.isActive) {
        throw new Error("CANNOT_DEACTIVATE_SELF");
      }

      member.isActive = input.isActive;
      return;
    }

    const snapshot = await staffDb.fetchStaffSnapshot(input.restaurantId);
    const member = snapshot.members.find(
      (m) => m.membershipId === input.membershipId,
    );
    if (!member) throw new Error("MEMBER_NOT_FOUND");
    if (
      !input.isActive &&
      member.roleSlug === "admin" &&
      countActiveAdmins(snapshot.members) <= 1
    ) {
      throw new Error("LAST_ADMIN");
    }
    if (member.userId === context.userId && !input.isActive) {
      throw new Error("CANNOT_DEACTIVATE_SELF");
    }

    await staffDb.setMembershipActive(input);
  },

  async cancelInvitation(
    context: AuthContext,
    input: { restaurantId: string; invitationId: string },
  ) {
    assertCanManage(context, input.restaurantId);

    if (canUseDemoExperience()) {
      const store = getDemoRestaurantStore();
      const invite = store.staffInvitations.find(
        (i) =>
          i.id === input.invitationId &&
          i.restaurantId === input.restaurantId,
      );
      if (!invite) throw new Error("INVITE_NOT_FOUND");
      invite.status = "cancelled";
      return;
    }

    await staffDb.cancelInvitation(input);
  },

  canManage(context: AuthContext, restaurantId?: string) {
    if (canUseDemoExperience()) return true;
    try {
      requirePermission(context, PERMISSIONS.STAFF_MANAGE, restaurantId);
      return true;
    } catch {
      return false;
    }
  },
};

export function getStaffMembership(context: AuthContext, restaurantId: string) {
  return getActiveMembership(context, restaurantId);
}
