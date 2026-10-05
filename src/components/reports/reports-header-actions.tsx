"use client";

import { useState } from "react";
import { CloudUpload, Download, Upload } from "lucide-react";
import { ExportReportDialog } from "@/components/reports/export-report-dialog";
import { ImportReportDialog } from "@/components/reports/import-report-dialog";
import { SiigoSendDialog } from "@/components/reports/siigo-send-dialog";
import { Button } from "@/components/ui/button";

export function ReportsHeaderActions() {
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [siigoOpen, setSiigoOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setImportOpen(true)}
      >
        <Upload className="size-4" />
        <span className="hidden sm:inline">Importar</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setExportOpen(true)}
      >
        <Download className="size-4" />
        <span className="hidden sm:inline">Exportar</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setSiigoOpen(true)}
      >
        <CloudUpload className="size-4" />
        <span className="hidden sm:inline">Enviar a Siigo</span>
      </Button>

      <ImportReportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ExportReportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <SiigoSendDialog open={siigoOpen} onOpenChange={setSiigoOpen} />
    </>
  );
}
