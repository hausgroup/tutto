"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StaffSnapshot } from "@/lib/staff/types";
import {
  cancelStaffInvitationAction,
  inviteStaffAction,
  setStaffActiveAction,
  updateStaffRoleAction,
} from "@/lib/staff/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";

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

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {snapshot.members.length} miembro(s)
          {snapshot.invitations.length > 0
            ? ` · ${snapshot.invitations.length} invitación(es) pendiente(s)`
            : null}
        </p>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" />
              Invitar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar personal</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-2">
                <Label htmlFor="staff-name">Nombre</Label>
                <Input
                  id="staff-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ana Pérez"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-email">Correo</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ana@restaurante.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select
                  value={roleSlug}
                  onValueChange={(value) =>
                    setRoleSlug(value as "admin" | "staff")
                  }
                >
                  <SelectTrigger>
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
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={pending || !email.trim() || !fullName.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const result = await inviteStaffAction({
                      email,
                      fullName,
                      roleSlug,
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
                    refresh();
                  })
                }
              >
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Miembros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {snapshot.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay miembros. Invita al primer colaborador.
            </p>
          ) : (
            snapshot.members.map((member) => {
              const isSelf = member.userId === currentUserId;
              return (
                <div
                  key={member.membershipId}
                  className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">
                        {member.fullName || member.email}
                      </p>
                      {isSelf ? (
                        <Badge variant="secondary">Tú</Badge>
                      ) : null}
                      {!member.isActive ? (
                        <Badge variant="outline">Inactivo</Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Select
                      value={member.roleSlug}
                      disabled={pending}
                      onValueChange={(value) =>
                        startTransition(async () => {
                          const result = await updateStaffRoleAction({
                            membershipId: member.membershipId,
                            roleSlug: value as "admin" | "staff",
                          });
                          if (result.error) {
                            toast.error(result.error);
                            return;
                          }
                          refresh();
                        })
                      }
                    >
                      <SelectTrigger className="w-[160px]">
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
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={member.isActive}
                        disabled={pending || isSelf}
                        onCheckedChange={(checked) =>
                          startTransition(async () => {
                            const result = await setStaffActiveAction({
                              membershipId: member.membershipId,
                              isActive: checked,
                            });
                            if (result.error) {
                              toast.error(result.error);
                              return;
                            }
                            refresh();
                          })
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        Activo
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {snapshot.invitations.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Invitaciones pendientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.invitations.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {invite.fullName || invite.email}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {invite.email} · {invite.roleName}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await cancelStaffInvitationAction(
                        invite.id,
                      );
                      if (result.error) {
                        toast.error(result.error);
                        return;
                      }
                      refresh();
                    })
                  }
                >
                  <Trash2 className="size-4" />
                  Cancelar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
