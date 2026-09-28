"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTestFeedbackAction } from "@/lib/feedback/actions";
import type {
  TestFeedbackEntry,
  TestFeedbackKind,
} from "@/lib/feedback/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const kindLabels: Record<TestFeedbackKind, string> = {
  issue: "Problema",
  feedback: "Comentario",
  note: "Nota",
};

const kindBadgeVariant: Record<
  TestFeedbackKind,
  "destructive" | "secondary" | "outline"
> = {
  issue: "destructive",
  feedback: "secondary",
  note: "outline",
};

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function FeedbackPanel({
  entries,
  isDemo,
}: {
  entries: TestFeedbackEntry[];
  isDemo: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<TestFeedbackKind>("issue");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pagePath, setPagePath] = useState("");

  function submit() {
    startTransition(async () => {
      const result = await createTestFeedbackAction({
        kind,
        title,
        body,
        pagePath: pagePath.trim() || undefined,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Feedback registrado");
      setTitle("");
      setBody("");
      setPagePath("");
      setKind("issue");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {isDemo ? (
        <p className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-muted-foreground">
          Modo demo: los reportes se guardan en memoria y se pierden al reiniciar
          el servidor.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar issue o comentario</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as TestFeedbackKind)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="issue">Problema / bug</SelectItem>
                  <SelectItem value="feedback">Comentario general</SelectItem>
                  <SelectItem value="note">Nota rápida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-page">Pantalla (opcional)</Label>
              <Input
                id="feedback-page"
                value={pagePath}
                onChange={(e) => setPagePath(e.target.value)}
                placeholder="/pos/… o Salón"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-title">Título</Label>
            <Input
              id="feedback-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. No imprime ticket de bar"
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-body">Detalle</Label>
            <Textarea
              id="feedback-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Qué hiciste, qué esperabas y qué pasó…"
              rows={5}
              maxLength={8000}
            />
          </div>
          <Button
            type="button"
            disabled={pending || !title.trim() || !body.trim()}
            onClick={submit}
            className="w-full sm:w-auto"
          >
            {pending ? "Guardando…" : "Enviar feedback"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Del equipo de pruebas</h3>
          <span className="text-xs text-muted-foreground">
            {entries.length} registro(s)
          </span>
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay feedback. Sé el primero en reportar algo.
          </p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Card className="shadow-none">
                  <CardContent className="space-y-2 pt-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug">{entry.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {entry.authorName}
                          {entry.authorEmail ? ` · ${entry.authorEmail}` : null}
                          {" · "}
                          {formatWhen(entry.createdAt)}
                        </p>
                      </div>
                      <Badge variant={kindBadgeVariant[entry.kind]}>
                        {kindLabels[entry.kind]}
                      </Badge>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {entry.body}
                    </p>
                    {entry.pagePath ? (
                      <p className="text-xs text-muted-foreground">
                        Pantalla:{" "}
                        <span className="font-mono text-foreground">
                          {entry.pagePath}
                        </span>
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
