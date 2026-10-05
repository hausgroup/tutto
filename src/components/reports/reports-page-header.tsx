"use client";

import { PageHeaderActions } from "@/components/layout/page-header-actions";
import { ReportsHeaderActions } from "@/components/reports/reports-header-actions";

export function ReportsPageHeader() {
  return (
    <PageHeaderActions>
      <ReportsHeaderActions />
    </PageHeaderActions>
  );
}
