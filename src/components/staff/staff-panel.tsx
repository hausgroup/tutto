"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Cake,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import type {
  StaffInvitation,
  StaffMember,
  StaffSnapshot,
} from "@/lib/staff/types";
import {
  cancelStaffInvitationAction,
  inviteStaffAction,
  setStaffActiveAction,
  updateStaffHrAction,
  updateStaffInvitationAction,
  updateStaffRoleAction,
} from "@/lib/staff/actions";
import {
  daysUntilNextBirthday,
  formatBirthdayLabel,
  formatStaffDate,
  hireDateFromMembership,
} from "@/lib/staff/hr-dates";
import {
  STAFF_WORK_AREA_IDS,
  STAFF_WORK_AREA_LABELS,
  workAreaLabel,
  type StaffWorkAreaId,
} from "@/lib/staff/work-areas";
import { PageHeaderActions } from "@/components/layout/page-header-actions";
import { PageStat, PageStatGrid } from "@/components/ui/page-stat";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  FormDialogBody,
  FormDialogContent,
  FormDialogFooter,
  FormDialogHeader,
  FormDialogTitle,
  formSelectTriggerClassName,
} from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import {
  ModalForm,
  ModalFormField,
  ModalFormRow,
} from "@/components/ui/modal-form-grid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const staffCardActionClass = buttonVariants({ variant: "outline", size: "sm" });

function invitationEmailForMember(
  member: StaffMember,
  invitations: StaffInvitation[],
): string | undefined {
  const memberEmail = member.email.trim().toLowerCase();
  const memberName = member.fullName.trim().toLowerCase();
  const match = invitations.find((invite) => {
    const inviteEmail = invite.email.trim().toLowerCase();
    const inviteName = invite.fullName.trim().toLowerCase();
    if (memberEmail && inviteEmail === memberEmail) return true;
    if (memberName && inviteName && inviteName === memberName) return true;
    return false;
  });
  return match?.email;
}

function profileEmailDefault(
  member: StaffMember,
  invitations: StaffInvitation[],
) {
  const fromProfile = member.email.trim();
  if (fromProfile) return fromProfile;
  return invitationEmailForMember(member, invitations) ?? "";
}

function memberInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function groupMembersByArea(members: StaffMember[]) {
  const groups = new Map<string, StaffMember[]>();
  for (const id of STAFF_WORK_AREA_IDS) {
    groups.set(id, []);
  }
  groups.set("sin_asignar", []);

  for (const member of members) {
    const key = member.workArea ?? "sin_asignar";
    const list = groups.get(key) ?? groups.get("sin_asignar")!;
    list.push(member);
  }

  const ordered: { areaId: string; label: string; members: StaffMember[] }[] =
    [];
  for (const id of STAFF_WORK_AREA_IDS) {
    const list = groups.get(id) ?? [];
    if (list.length > 0) {
      ordered.push({
        areaId: id,
        label: STAFF_WORK_AREA_LABELS[id],
        members: list.sort((a, b) =>
          a.fullName.localeCompare(b.fullName, "es"),
        ),
      });
    }
  }
  const unassigned = groups.get("sin_asignar") ?? [];
  if (unassigned.length > 0) {
    ordered.push({
      areaId: "sin_asignar",
      label: "Sin asignar",
      members: unassigned.sort((a, b) =>
        a.fullName.localeCompare(b.fullName, "es"),
      ),
    });
  }
  return ordered;
}

function StaffHrEditDialog({
  member,
  invitations,
  open,
  onOpenChange,
  onSaved,
}: {
  member: StaffMember;
  invitations: StaffInvitation[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(member.fullName);
  const [email, setEmail] = useState(() =>
    profileEmailDefault(member, invitations),
  );
  const [workArea, setWorkArea] = useState<StaffWorkAreaId | "none">(
    member.workArea ?? "none",
  );
  const [hiredAt, setHiredAt] = useState(
    hireDateFromMembership(member.hiredAt, member.createdAt),
  );
  const [birthDate, setBirthDate] = useState(member.birthDate ?? "");
  const [phone, setPhone] = useState(member.phone ?? "");

  useEffect(() => {
    if (!open) return;
    setFullName(member.fullName);
    setEmail(profileEmailDefault(member, invitations));
    setWorkArea(member.workArea ?? "none");
    setHiredAt(hireDateFromMembership(member.hiredAt, member.createdAt));
    setBirthDate(member.birthDate ?? "");
    setPhone(member.phone ?? "");
  }, [open, member, invitations]);

  function save() {
    startTransition(async () => {
      const result = await updateStaffHrAction({
        membershipId: member.membershipId,
        fullName: fullName.trim(),
        email: email.trim(),
        workArea: workArea === "none" ? null : workArea,
        hiredAt: hiredAt || null,
        birthDate: birthDate || null,
        phone: phone.trim() || null,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Datos actualizados");
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-md">
        <FormDialogHeader>
          <FormDialogTitle>Ficha de {member.fullName || member.email}</FormDialogTitle>
        </FormDialogHeader>
        <FormDialogBody>
          <ModalForm>
            <ModalFormField label="Nombre" htmlFor="staff-hr-name">
              <Input
                id="staff-hr-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ana Pérez"
              />
            </ModalFormField>
            <ModalFormField label="Correo" htmlFor="staff-hr-email">
              <Input
                id="staff-hr-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ana@restaurante.com"
              />
            </ModalFormField>
            <ModalFormField label="Área en el restaurante">
              <Select
                value={workArea}
                onValueChange={(v) =>
                  setWorkArea(v as StaffWorkAreaId | "none")
                }
              >
                <SelectTrigger className={formSelectTriggerClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {STAFF_WORK_AREA_IDS.map((id) => (
                    <SelectItem key={id} value={id}>
                      {STAFF_WORK_AREA_LABELS[id]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ModalFormField>
            <ModalFormRow cols={2}>
              <ModalFormField label="Fecha de ingreso">
                <Input
                  type="date"
                  value={hiredAt}
                  onChange={(e) => setHiredAt(e.target.value)}
                />
              </ModalFormField>
              <ModalFormField label="Cumpleaños">
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </ModalFormField>
            </ModalFormRow>
            <ModalFormField label="Teléfono">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+57 300 000 0000"
              />
            </ModalFormField>
          </ModalForm>
        </FormDialogBody>
        <FormDialogFooter>
          <Button
            onClick={save}
            disabled={pending || !fullName.trim() || !email.trim()}
          >
            Guardar
          </Button>
        </FormDialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}

function StaffInvitationEditDialog({
  invite,
  open,
  onOpenChange,
  onSaved,
}: {
  invite: StaffInvitation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(invite.fullName);
  const [email, setEmail] = useState(invite.email);

  useEffect(() => {
    if (!open) return;
    setFullName(invite.fullName);
    setEmail(invite.email);
  }, [open, invite]);

  function save() {
    startTransition(async () => {
      const result = await updateStaffInvitationAction({
        invitationId: invite.id,
        fullName: fullName.trim(),
        email: email.trim(),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Invitación actualizada");
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="sm:max-w-md">
        <FormDialogHeader>
          <FormDialogTitle>Editar invitación</FormDialogTitle>
        </FormDialogHeader>
        <FormDialogBody>
          <ModalForm>
            <ModalFormField label="Nombre" htmlFor="staff-invite-name">
              <Input
                id="staff-invite-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </ModalFormField>
            <ModalFormField label="Correo" htmlFor="staff-invite-email">
              <Input
                id="staff-invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </ModalFormField>
          </ModalForm>
        </FormDialogBody>
        <FormDialogFooter>
          <Button
            onClick={save}
            disabled={pending || !fullName.trim() || !email.trim()}
          >
            Guardar
          </Button>
        </FormDialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}

function StaffMemberCard({
  member,
  currentUserId,
  roles,
  invitations,
  onRefresh,
}: {
  member: StaffMember;
  currentUserId: string;
  roles: StaffSnapshot["roles"];
  invitations: StaffInvitation[];
  onRefresh: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const isSelf = member.userId === currentUserId;
  const hireLabel = formatStaffDate(
    hireDateFromMembership(member.hiredAt, member.createdAt),
  );
  const birthdayLabel = formatBirthdayLabel(member.birthDate);
  const daysToBirthday =
    member.birthDate != null
      ? daysUntilNextBirthday(member.birthDate)
      : null;

  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-3 rounded-[20px] p-4 ring-1 ring-border sm:flex-row sm:items-center sm:justify-between",
          member.isActive ? "bg-card" : "bg-muted/40 opacity-80",
        )}
      >
        <div className="flex min-w-0 gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground"
            aria-hidden
          >
            {memberInitials(member.fullName || member.email)}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-semibold leading-snug">
                {member.fullName || member.email}
              </p>
              {isSelf ? <Badge variant="secondary">Tú</Badge> : null}
              {!member.isActive ? (
                <Badge variant="outline">Inactivo</Badge>
              ) : null}
              {daysToBirthday != null && daysToBirthday <= 14 ? (
                <Badge className="gap-1 bg-amber-500/15 text-amber-900 dark:text-amber-100">
                  <Cake className="size-3" />
                  {daysToBirthday === 0
                    ? "Cumple hoy"
                    : `Cumple en ${daysToBirthday}d`}
                </Badge>
              ) : null}
            </div>
            <p className="flex items-center gap-1.5 truncate text-[13px] text-muted-foreground">
              <Mail className="size-3.5 shrink-0" />
              {member.email}
            </p>
            <dl className="grid gap-0.5 text-[13px] text-muted-foreground sm:grid-cols-2 sm:gap-x-4">
              <div>
                <span className="text-foreground/80">Ingreso:</span> {hireLabel}
              </div>
              <div>
                <span className="text-foreground/80">Cumpleaños:</span>{" "}
                {birthdayLabel}
              </div>
              <div>
                <span className="text-foreground/80">Área:</span>{" "}
                {workAreaLabel(member.workArea)}
              </div>
              <div className="flex items-center gap-1">
                <Phone className="size-3.5 shrink-0" />
                {member.phone?.trim() ? member.phone : "—"}
              </div>
            </dl>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" />
            Editar ficha
          </Button>
          <Select
            value={member.roleSlug}
            disabled={pending}
            onValueChange={(value) =>
              startTransition(async () => {
                const result = await updateStaffRoleAction({
                  membershipId: member.membershipId,
                  roleSlug: value as "admin" | "staff",
                });
                if (result.error) toast.error(result.error);
                else onRefresh();
              })
            }
          >
            <SelectTrigger
              size="sm"
              className={cn(
                "w-auto min-w-0 shadow-none dark:bg-muted dark:hover:bg-muted/80",
                staffCardActionClass,
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.slug}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || isSelf}
            onClick={() =>
              startTransition(async () => {
                const result = await setStaffActiveAction({
                  membershipId: member.membershipId,
                  isActive: !member.isActive,
                });
                if (result.error) toast.error(result.error);
                else onRefresh();
              })
            }
          >
            {member.isActive ? "Activo" : "Inactivo"}
          </Button>
        </div>
      </div>

      <StaffHrEditDialog
        member={member}
        invitations={invitations}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={onRefresh}
      />
    </>
  );
}

function StaffInvitationRow({
  invite,
  onRefresh,
}: {
  invite: StaffInvitation;
  onRefresh: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div
        className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="truncate font-medium">
            {invite.fullName || invite.email}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {invite.email} · {invite.roleName}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await cancelStaffInvitationAction(invite.id);
                if (result.error) toast.error(result.error);
                else onRefresh();
              })
            }
          >
            <Trash2 className="size-4" />
            Cancelar
          </Button>
        </div>
      </div>
      <StaffInvitationEditDialog
        invite={invite}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={onRefresh}
      />
    </>
  );
}

export function StaffPanel({
  snapshot,
  currentUserId,
}: {
  snapshot: StaffSnapshot;
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleSlug, setRoleSlug] = useState<"admin" | "staff">("staff");
  const [inviteWorkArea, setInviteWorkArea] =
    useState<StaffWorkAreaId>("salon");

  function refresh() {
    router.refresh();
  }

  const activeMembers = useMemo(
    () => snapshot.members.filter((m) => m.isActive),
    [snapshot.members],
  );

  const areaGroups = useMemo(
    () => groupMembersByArea(snapshot.members.filter((m) => m.isActive)),
    [snapshot.members],
  );

  const areasUsed = areaGroups.length;

  const upcomingBirthdays = useMemo(() => {
    return activeMembers
      .filter((m) => m.birthDate)
      .map((m) => ({
        member: m,
        days: daysUntilNextBirthday(m.birthDate!),
      }))
      .filter((item) => item.days <= 30)
      .sort((a, b) => a.days - b.days);
  }, [activeMembers]);

  return (
    <div className="space-y-8">
      <PageHeaderActions>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="size-4" />
                Invitar
              </Button>
            </DialogTrigger>
            <FormDialogContent>
              <FormDialogHeader>
                <FormDialogTitle>Invitar personal</FormDialogTitle>
              </FormDialogHeader>
              <FormDialogBody>
                <ModalForm>
                  <ModalFormField label="Nombre" htmlFor="staff-name">
                    <Input
                      id="staff-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ana Pérez"
                    />
                  </ModalFormField>
                  <ModalFormField label="Correo" htmlFor="staff-email">
                    <Input
                      id="staff-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ana@restaurante.com"
                    />
                  </ModalFormField>
                  <ModalFormRow cols={2}>
                    <ModalFormField label="Rol">
                      <Select
                        value={roleSlug}
                        onValueChange={(v) =>
                          setRoleSlug(v as "admin" | "staff")
                        }
                      >
                        <SelectTrigger className={formSelectTriggerClassName}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {snapshot.roles.map((role) => (
                            <SelectItem key={role.id} value={role.slug}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </ModalFormField>
                    <ModalFormField label="Área">
                      <Select
                        value={inviteWorkArea}
                        onValueChange={(v) =>
                          setInviteWorkArea(v as StaffWorkAreaId)
                        }
                      >
                        <SelectTrigger className={formSelectTriggerClassName}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAFF_WORK_AREA_IDS.map((id) => (
                            <SelectItem key={id} value={id}>
                              {STAFF_WORK_AREA_LABELS[id]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </ModalFormField>
                  </ModalFormRow>
                </ModalForm>
              </FormDialogBody>
              <FormDialogFooter>
                <Button
                  disabled={pending || !email.trim() || !fullName.trim()}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await inviteStaffAction({
                        email,
                        fullName,
                        roleSlug,
                        workArea: inviteWorkArea,
                      });
                      if (result.error) {
                        toast.error(result.error);
                        return;
                      }
                      toast.success("Personal agregado");
                      setInviteOpen(false);
                      setEmail("");
                      setFullName("");
                      setRoleSlug("staff");
                      setInviteWorkArea("salon");
                      refresh();
                    })
                  }
                >
                  Guardar
                </Button>
              </FormDialogFooter>
            </FormDialogContent>
          </Dialog>
        </div>
      </PageHeaderActions>

      <PageStatGrid columns={4}>
        <PageStat
          label="Equipo activo"
          value={activeMembers.length}
          hint={`${snapshot.members.length} en total`}
        />
        <PageStat
          label="Áreas"
          value={areasUsed}
          hint="Con personal asignado"
        />
        <PageStat
          label="Cumpleaños (30 días)"
          value={upcomingBirthdays.length}
          hint={
            upcomingBirthdays[0]
              ? `${upcomingBirthdays[0].member.fullName.split(" ")[0]} en ${upcomingBirthdays[0].days}d`
              : "Nada cercano"
          }
        />
        <PageStat
          label="Invitaciones"
          value={snapshot.invitations.length}
          hint="Pendientes de alta"
        />
      </PageStatGrid>

      {upcomingBirthdays.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold tracking-tight">
            Próximos cumpleaños
          </h2>
          <div className="flex flex-wrap gap-2">
            {upcomingBirthdays.map(({ member, days }) => (
              <span
                key={member.membershipId}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[13px] ring-1 ring-border"
              >
                <Cake className="size-3.5 text-muted-foreground" />
                <span className="font-medium">{member.fullName}</span>
                <span className="text-muted-foreground">
                  · {formatBirthdayLabel(member.birthDate)}
                  {days === 0 ? " (hoy)" : ` (${days}d)`}
                </span>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {areaGroups.length === 0 ? (
        <p className="rounded-2xl bg-card px-4 py-10 text-center text-[13px] text-muted-foreground ring-1 ring-border">
          Aún no hay personal activo. Invita al primer colaborador.
        </p>
      ) : (
        areaGroups.map((group) => (
          <section key={group.areaId} className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <h2 className="text-[15px] font-semibold tracking-tight">
                {group.label}
              </h2>
              <span className="text-[13px] tabular-nums text-muted-foreground">
                {group.members.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {group.members.map((member) => (
                <StaffMemberCard
                  key={member.membershipId}
                  member={member}
                  currentUserId={currentUserId}
                  roles={snapshot.roles}
                  invitations={snapshot.invitations}
                  onRefresh={refresh}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {snapshot.members.some((m) => !m.isActive) ? (
        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold tracking-tight">
            Inactivos
          </h2>
          <div className="flex flex-col gap-3">
            {snapshot.members
              .filter((m) => !m.isActive)
              .map((member) => (
                <StaffMemberCard
                  key={member.membershipId}
                  member={member}
                  currentUserId={currentUserId}
                  roles={snapshot.roles}
                  invitations={snapshot.invitations}
                  onRefresh={refresh}
                />
              ))}
          </div>
        </section>
      ) : null}

      {snapshot.invitations.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold tracking-tight">
            Invitaciones pendientes
          </h2>
          <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            {snapshot.invitations.map((invite) => (
              <StaffInvitationRow
                key={invite.id}
                invite={invite}
                onRefresh={refresh}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
