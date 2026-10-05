"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import {
  commitHistoricalImportAction,
  previewHistoricalImportAction,
} from "@/lib/reports/import-actions";
import {
  IMPORT_PROFILE_IDS,
  IMPORT_PROFILE_LABELS,
  type ImportPreview,
  type ImportProfileId,
} from "@/lib/reports/historical-sales/types";
import { formatCurrency } from "@/lib/utils/money";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;

export function ImportReportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [filename, setFilename] = useState("");
  const [content, setContent] = useState("");
  const [sourceLabel, setSourceLabel] = useState("Herramienta anterior");
  const [profile, setProfile] = useState<ImportProfileId>("auto");
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  function reset() {
    setFilename("");
    setContent("");
    setPreview(null);
    setProfile("auto");
    setSourceLabel("Herramienta anterior");
    if (inputRef.current) inputRef.current.value = "";
  }

  function onOpenChangeWrapped(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function readFile(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("El archivo supera 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setFilename(file.name);
      setContent(text);
      setPreview(null);
    };
    reader.readAsText(file);
  }

  function runPreview() {
    if (!content.trim()) {
      toast.error("Selecciona un archivo CSV o XML.");
      return;
    }
    startTransition(async () => {
      const result = await previewHistoricalImportAction({
        filename,
        content,
        profile,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setPreview(result.preview);
      if (result.preview.suggestedProfile !== profile) {
        setProfile(result.preview.suggestedProfile);
      }
      toast.success("Vista previa lista");
    });
  }

  function runImport() {
    if (!content.trim()) return;
    startTransition(async () => {
      const result = await commitHistoricalImportAction({
        filename,
        content,
        profile,
        sourceLabel,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Importadas ${result.inserted} venta(s)${
          result.skipped > 0 ? ` · ${result.skipped} duplicada(s)` : ""
        }`,
      );
      onOpenChangeWrapped(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChangeWrapped}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar histórico</DialogTitle>
          <DialogDescription>
            Sube un CSV o XML de tu herramienta anterior. Mapeamos columnas
            comunes (incluidos los CSV que exporta Haus) y las sumamos a
            Reportes sin crear pedidos en POS.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="import-file">Archivo</Label>
            <Input
              ref={inputRef}
              id="import-file"
              type="file"
              accept=".csv,.xml,text/csv,text/xml,application/xml"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) readFile(file);
              }}
            />
            {filename ? (
              <p className="text-xs text-muted-foreground">{filename}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="import-source">Origen (opcional)</Label>
            <Input
              id="import-source"
              value={sourceLabel}
              onChange={(event) => setSourceLabel(event.target.value)}
              placeholder="Ej. Siigo, anterior POS…"
            />
          </div>

          <div className="space-y-2">
            <Label>Formato / mapeo</Label>
            <Select
              value={profile}
              onValueChange={(value) => setProfile(value as ImportProfileId)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMPORT_PROFILE_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {IMPORT_PROFILE_LABELS[id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preview ? (
            <div className="space-y-2 rounded-2xl bg-muted/50 p-4 text-sm ring-1 ring-border">
              <p>
                <span className="text-muted-foreground">Ventas:</span>{" "}
                <strong>{preview.saleCount}</strong>
                {preview.dateRange ? (
                  <>
                    {" "}
                    · {preview.dateRange.from} → {preview.dateRange.to}
                  </>
                ) : null}
              </p>
              <p>
                <span className="text-muted-foreground">Total:</span>{" "}
                <strong>{formatCurrency(preview.totalMinor)}</strong>
              </p>
              <p className="text-xs text-muted-foreground">
                Perfil: {IMPORT_PROFILE_LABELS[preview.suggestedProfile]}
              </p>
              {preview.warnings.length > 0 ? (
                <ul className="list-disc space-y-1 pl-4 text-xs text-amber-800 dark:text-amber-200">
                  {preview.warnings.slice(0, 4).map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
              <div className="space-y-1 border-t border-border/60 pt-2">
                {preview.sampleSales.map((sale, index) => (
                  <div
                    key={`${sale.closedAt}-${index}`}
                    className="flex justify-between gap-2 text-xs"
                  >
                    <span>
                      {sale.closedAt}
                      {sale.orderNumber ? ` · #${sale.orderNumber}` : ""}
                      {sale.itemCount > 0 ? ` · ${sale.itemCount} ítems` : ""}
                    </span>
                    <span className="tabular-nums">
                      {formatCurrency(sale.totalMinor)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChangeWrapped(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending || !content}
            onClick={runPreview}
          >
            Vista previa
          </Button>
          <Button
            type="button"
            disabled={pending || !content}
            className={cn(!preview && "opacity-80")}
            onClick={() => {
              if (!preview) {
                runPreview();
                return;
              }
              runImport();
            }}
          >
            <Upload className="size-4" />
            {pending ? "Importando…" : preview ? "Importar" : "Previsualizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
