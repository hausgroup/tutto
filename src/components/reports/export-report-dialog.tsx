"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { exportReportAction } from "@/lib/reports/actions";
import {
  EXPORT_REPORT_KINDS,
  EXPORT_REPORT_LABELS,
  type ExportReportKind,
} from "@/lib/reports/export";
import { calendarDateInBogota } from "@/lib/utils/date";
import { Button } from "@/components/ui/button";
import { SoftDatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogDescription } from "@/components/ui/dialog";
import {
  FormDialogBody,
  FormDialogContent,
  FormDialogFooter,
  FormDialogHeader,
  FormDialogTitle,
} from "@/components/ui/form-dialog";
import {
  ModalForm,
  ModalFormField,
  ModalFormRow,
} from "@/components/ui/modal-form-grid";
import { cn } from "@/lib/utils";

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExportReportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const today = useMemo(() => calendarDateInBogota(new Date()), []);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [kind, setKind] = useState<ExportReportKind>("daily_sales");
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [pending, startTransition] = useTransition();

  function exportReport() {
    startTransition(async () => {
      const result = await exportReportAction({ kind, from, to });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      downloadCsv(result.filename, result.csv);
      toast.success("Reporte exportado");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="overflow-visible">
        <FormDialogHeader>
          <FormDialogTitle>Exportar reportes</FormDialogTitle>
          <DialogDescription className="text-left">
            Elige el tipo de reporte y el rango de fechas (zona Bogotá).
          </DialogDescription>
        </FormDialogHeader>

        <FormDialogBody className="overflow-visible">
          <ModalForm>
            <ModalFormField label="Tipo de reporte">
              <div className="grid grid-cols-1 gap-2">
                {EXPORT_REPORT_KINDS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setKind(option)}
                    className={cn(
                      "rounded-full px-4 py-3 text-left text-sm transition-colors",
                      kind === option
                        ? "bg-foreground text-background"
                        : "bg-muted text-foreground ring-1 ring-border",
                    )}
                  >
                    {EXPORT_REPORT_LABELS[option]}
                  </button>
                ))}
              </div>
            </ModalFormField>

            <ModalFormRow cols={2}>
              <ModalFormField label="Desde" htmlFor="export-from">
                <SoftDatePicker
                  id="export-from"
                  value={from}
                  max={to}
                  onChange={(next) => {
                    setFrom(next);
                    if (next > to) setTo(next);
                  }}
                />
              </ModalFormField>
              <ModalFormField label="Hasta" htmlFor="export-to">
                <SoftDatePicker
                  id="export-to"
                  value={to}
                  min={from}
                  max={today}
                  align="end"
                  onChange={(next) => {
                    setTo(next);
                    if (next < from) setFrom(next);
                  }}
                />
              </ModalFormField>
            </ModalFormRow>
          </ModalForm>
        </FormDialogBody>

        <FormDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={exportReport} disabled={pending || !from || !to}>
            <Download className="size-4" />
            {pending ? "Generando…" : "Descargar CSV"}
          </Button>
        </FormDialogFooter>
      </FormDialogContent>
    </Dialog>
  );
}
