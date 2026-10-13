"use client";

import { signOutAction } from "@/lib/auth/actions";
import { ModeToggle } from "@/components/mode-toggle";
import { PageHeaderActions } from "@/components/layout/page-header-actions";
import { Button } from "@/components/ui/button";

export function SettingsHeaderActions() {
  return (
    <PageHeaderActions>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <ModeToggle />
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            Salir
          </Button>
        </form>
      </div>
    </PageHeaderActions>
  );
}
