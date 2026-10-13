"use client";

import { PageHeaderActions } from "@/components/layout/page-header-actions";
import { ReportsHeaderActions } from "@/components/reports/reports-header-actions";

export function ReportsPageHeader() {
  return (
    <PageHeaderActions>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <ReportsHeaderActions />
      </div>
    </PageHeaderActions>
  );
}
