export type StaffRoleSlug = "admin" | "staff";

export type StaffMember = {
  membershipId: string;
  userId: string;
  restaurantId: string;
  email: string;
  fullName: string;
  roleSlug: StaffRoleSlug;
  roleName: string;
  roleId: string;
  isActive: boolean;
  createdAt: string;
};

export type StaffInvitation = {
  id: string;
  restaurantId: string;
  email: string;
  fullName: string;
  roleSlug: StaffRoleSlug;
  roleName: string;
  roleId: string;
  status: "pending" | "accepted" | "cancelled";
  createdAt: string;
};

export type StaffRoleOption = {
  id: string;
  slug: StaffRoleSlug;
  name: string;
};

export type StaffSnapshot = {
  members: StaffMember[];
  invitations: StaffInvitation[];
  roles: StaffRoleOption[];
};
