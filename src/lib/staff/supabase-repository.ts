import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isUndefinedColumnError } from "@/lib/supabase/postgres-errors";
import { normalizeWorkArea } from "@/lib/staff/work-areas";
import type {
  StaffInvitation,
  StaffMember,
  StaffRoleOption,
  StaffRoleSlug,
  StaffSnapshot,
} from "@/lib/staff/types";
import type { StaffWorkAreaId } from "@/lib/staff/work-areas";

type RoleRow = {
  id: string;
  slug: string;
  name: string;
};

type MembershipListRow = {
  id: string;
  restaurant_id: string;
  user_id: string;
  role_id: string;
  is_active: boolean;
  created_at: string;
  work_area?: string | null;
  hired_at?: string | null;
  profiles: {
    email: string;
    full_name: string;
    phone: string | null;
    birth_date?: string | null;
  } | null;
  roles: {
    id: string;
    slug: string;
    name: string;
  } | null;
};

const MEMBERSHIP_SELECT_WITH_HR = `
  id,
  restaurant_id,
  user_id,
  role_id,
  is_active,
  created_at,
  work_area,
  hired_at,
  profiles ( email, full_name, phone, birth_date ),
  roles ( id, slug, name )
`;

const MEMBERSHIP_SELECT_LEGACY = `
  id,
  restaurant_id,
  user_id,
  role_id,
  is_active,
  created_at,
  profiles ( email, full_name, phone ),
  roles ( id, slug, name )
`;

function mapMembershipRow(row: MembershipListRow): StaffMember {
  return {
    membershipId: row.id,
    userId: row.user_id,
    restaurantId: row.restaurant_id,
    email: row.profiles?.email ?? "",
    fullName: row.profiles?.full_name ?? "",
    phone: row.profiles?.phone ?? null,
    birthDate: row.profiles?.birth_date ?? null,
    workArea: normalizeWorkArea(row.work_area ?? null),
    hiredAt: row.hired_at ?? null,
    roleSlug: asRoleSlug(row.roles?.slug ?? "staff"),
    roleName: row.roles?.name ?? "Personal",
    roleId: row.role_id,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

async function listMemberships(restaurantId: string) {
  const supabase = await createSupabaseServerClient();
  const withHr = await supabase
    .from("restaurant_memberships")
    .select(MEMBERSHIP_SELECT_WITH_HR)
    .eq("restaurant_id", restaurantId)
    .order("created_at");

  if (!withHr.error) {
    return (withHr.data ?? []) as unknown as MembershipListRow[];
  }
  if (!isUndefinedColumnError(withHr.error)) throw withHr.error;

  const legacy = await supabase
    .from("restaurant_memberships")
    .select(MEMBERSHIP_SELECT_LEGACY)
    .eq("restaurant_id", restaurantId)
    .order("created_at");

  if (legacy.error) throw legacy.error;
  return (legacy.data ?? []) as unknown as MembershipListRow[];
}

type InvitationRow = {
  id: string;
  restaurant_id: string;
  email: string;
  full_name: string;
  role_id: string;
  status: "pending" | "accepted" | "cancelled";
  created_at: string;
  roles: { id: string; slug: string; name: string } | null;
};

function asRoleSlug(slug: string): StaffRoleSlug {
  return slug === "admin" ? "admin" : "staff";
}

async function listRoles(): Promise<StaffRoleOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, slug, name")
    .in("slug", ["admin", "staff"])
    .order("name");

  if (error) throw error;
  return ((data ?? []) as RoleRow[])
    .filter((r) => r.slug === "admin" || r.slug === "staff")
    .map((r) => ({
      id: r.id,
      slug: asRoleSlug(r.slug),
      name: r.name,
    }));
}

export async function fetchStaffSnapshot(
  restaurantId: string,
): Promise<StaffSnapshot> {
  const supabase = await createSupabaseServerClient();
  const roles = await listRoles();

  const [memberRows, { data: invites, error: invitesError }] = await Promise.all([
    listMemberships(restaurantId),
    supabase
      .from("staff_invitations")
      .select(
        `
          id,
          restaurant_id,
          email,
          full_name,
          role_id,
          status,
          created_at,
          roles ( id, slug, name )
        `,
      )
      .eq("restaurant_id", restaurantId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  if (invitesError) throw invitesError;

  return {
    roles,
    members: memberRows.map(mapMembershipRow),
    invitations: ((invites ?? []) as unknown as InvitationRow[]).map((row) => ({
      id: row.id,
      restaurantId: row.restaurant_id,
      email: row.email,
      fullName: row.full_name,
      roleSlug: asRoleSlug(row.roles?.slug ?? "staff"),
      roleName: row.roles?.name ?? "Personal",
      roleId: row.role_id,
      status: row.status,
      createdAt: row.created_at,
    })),
  };
}

export async function resolveRoleId(roleSlug: StaffRoleSlug): Promise<string> {
  const roles = await listRoles();
  const role = roles.find((r) => r.slug === roleSlug);
  if (!role) throw new Error("ROLE_NOT_FOUND");
  return role.id;
}

export async function countActiveAdmins(restaurantId: string): Promise<number> {
  const snapshot = await fetchStaffSnapshot(restaurantId);
  return snapshot.members.filter(
    (m) => m.isActive && m.roleSlug === "admin",
  ).length;
}

export async function inviteOrLinkMember(input: {
  restaurantId: string;
  email: string;
  fullName: string;
  roleSlug: StaffRoleSlug;
  invitedBy: string;
}): Promise<{ kind: "member" | "invitation"; email: string }> {
  const supabase = await createSupabaseServerClient();
  const roleId = await resolveRoleId(input.roleSlug);
  const email = input.email.trim().toLowerCase();

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    const profile = existingProfile as {
      id: string;
      email: string;
      full_name: string;
    };
    const { error } = await supabase.from("restaurant_memberships").insert({
      restaurant_id: input.restaurantId,
      user_id: profile.id,
      role_id: roleId,
      is_active: true,
    });
    if (error) {
      if (error.code === "23505") throw new Error("MEMBER_EXISTS");
      throw error;
    }
    if (input.fullName && !profile.full_name) {
      await supabase
        .from("profiles")
        .update({ full_name: input.fullName })
        .eq("id", profile.id);
    }
    return { kind: "member", email };
  }

  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: input.fullName },
      });
    if (inviteError) throw inviteError;
    const userId = invited.user?.id;
    if (!userId) throw new Error("INVITE_FAILED");

    // Profile trigger may race; upsert profile then membership
    await admin.from("profiles").upsert({
      id: userId,
      email,
      full_name: input.fullName,
    });

    const { error: membershipError } = await admin
      .from("restaurant_memberships")
      .insert({
        restaurant_id: input.restaurantId,
        user_id: userId,
        role_id: roleId,
        is_active: true,
      });
    if (membershipError) {
      if (membershipError.code !== "23505") throw membershipError;
    }
    return { kind: "member", email };
  }

  const { error: invitationError } = await supabase
    .from("staff_invitations")
    .insert({
      restaurant_id: input.restaurantId,
      email,
      full_name: input.fullName,
      role_id: roleId,
      invited_by: input.invitedBy,
      status: "pending",
    });

  if (invitationError) {
    if (invitationError.code === "23505") throw new Error("INVITE_EXISTS");
    throw invitationError;
  }

  return { kind: "invitation", email };
}

export async function updateMembershipRole(input: {
  restaurantId: string;
  membershipId: string;
  roleSlug: StaffRoleSlug;
}) {
  const roleId = await resolveRoleId(input.roleSlug);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("restaurant_memberships")
    .update({ role_id: roleId })
    .eq("id", input.membershipId)
    .eq("restaurant_id", input.restaurantId);
  if (error) throw error;
}

export async function setMembershipActive(input: {
  restaurantId: string;
  membershipId: string;
  isActive: boolean;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("restaurant_memberships")
    .update({ is_active: input.isActive })
    .eq("id", input.membershipId)
    .eq("restaurant_id", input.restaurantId);
  if (error) throw error;
}

export async function updateMemberHr(input: {
  restaurantId: string;
  membershipId: string;
  userId: string;
  previousEmail: string;
  fullName: string;
  email: string;
  workArea: StaffWorkAreaId | null;
  hiredAt: string | null;
  birthDate: string | null;
  phone: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const previousEmail = input.previousEmail.trim().toLowerCase();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const db = admin ?? supabase;

  const { error: membershipError } = await db
    .from("restaurant_memberships")
    .update({
      work_area: input.workArea,
      hired_at: input.hiredAt,
    })
    .eq("id", input.membershipId)
    .eq("restaurant_id", input.restaurantId);
  if (membershipError && !isUndefinedColumnError(membershipError)) {
    throw membershipError;
  }

  const profilePayload = {
    full_name: fullName,
    email,
    phone: input.phone,
    birth_date: input.birthDate,
  };

  const { error: profileError } = await db
    .from("profiles")
    .update(profilePayload)
    .eq("id", input.userId);
  if (profileError) {
    if (isUndefinedColumnError(profileError)) {
      const { error: legacyProfileError } = await db
        .from("profiles")
        .update({
          full_name: fullName,
          email,
          phone: input.phone,
        })
        .eq("id", input.userId);
      if (legacyProfileError) {
        if (legacyProfileError.code === "23505") {
          throw new Error("EMAIL_IN_USE");
        }
        throw legacyProfileError;
      }
      if (input.birthDate != null) {
        throw new Error("STAFF_HR_MIGRATION_REQUIRED");
      }
    }
    if (profileError.code === "23505") throw new Error("EMAIL_IN_USE");
    throw profileError;
  }

  if (admin) {
    const authUpdate: {
      email?: string;
      user_metadata: { full_name: string };
    } = { user_metadata: { full_name: fullName } };
    if (email !== previousEmail) authUpdate.email = email;

    const { error: authError } = await admin.auth.admin.updateUserById(
      input.userId,
      authUpdate,
    );
    if (authError) {
      if (authError.message?.toLowerCase().includes("already")) {
        throw new Error("EMAIL_IN_USE");
      }
      throw authError;
    }
  }
}

export async function updateStaffInvitation(input: {
  restaurantId: string;
  invitationId: string;
  fullName: string;
  email: string;
}) {
  const supabase = await createSupabaseServerClient();
  const email = input.email.trim().toLowerCase();
  const { error } = await supabase
    .from("staff_invitations")
    .update({
      email,
      full_name: input.fullName.trim(),
    })
    .eq("id", input.invitationId)
    .eq("restaurant_id", input.restaurantId);
  if (error) {
    if (error.code === "23505") throw new Error("INVITE_EXISTS");
    throw error;
  }
}

export async function cancelInvitation(input: {
  restaurantId: string;
  invitationId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("staff_invitations")
    .update({ status: "cancelled" })
    .eq("id", input.invitationId)
    .eq("restaurant_id", input.restaurantId);
  if (error) throw error;
}
