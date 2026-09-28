"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { CashierSession } from "@/lib/orders/types";
import {
  closeCashierAction,
  openCashierAction,
} from "@/lib/orders/actions";
import { calculateCashierDifference } from "@/lib/orders/calculate";
import { formatCurrency } from "@/lib/utils/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";

export function CashierPanel({
  initialSession,
}: {
  initialSession: CashierSession | null;
}) {
  const [session, setSession] = useState(initialSession);
  const [openingCash, setOpeningCash] = useState(0);
  const [actualCash, setActualCash] = useState(0);
  const [pending, startTransition] = useTransition();

  if (!session) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Abrir caja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="opening">Efectivo inicial</Label>
            <MoneyInput
              id="opening"
              value={openingCash}
              onValueChange={setOpeningCash}
              allowDecimals
              placeholder="0"
            />
          </div>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await openCashierAction(
                  Math.round(openingCash),
                );
                if (result.error) toast.error(result.error);
                else {
                  toast.success("Caja abierta");
                  window.location.reload();
                }
              })
            }
          >
            Abrir turno
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (session.status === "closed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Turno cerrado</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Abre un nuevo turno para continuar operando.
        </CardContent>
      </Card>
    );
  }

  const expected = session.openingCashMinor + session.cashSalesMinor;
  const actual = Math.round(actualCash);
  const difference = calculateCashierDifference(expected, actual);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Turno abierto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Apertura: {formatCurrency(session.openingCashMinor)}</p>
          <p>Ventas efectivo: {formatCurrency(session.cashSalesMinor)}</p>
          <p>Ventas tarjeta: {formatCurrency(session.cardSalesMinor)}</p>
          <p>Transferencias: {formatCurrency(session.transferSalesMinor)}</p>
          <p className="font-medium">
            Efectivo esperado: {formatCurrency(expected)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cierre de caja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="actual">Efectivo contado</Label>
            <MoneyInput
              id="actual"
              value={actualCash}
              onValueChange={setActualCash}
              allowDecimals
              placeholder="0"
            />
          </div>
          <p className="text-sm">
            Diferencia:{" "}
            <span
              className={
                difference === 0
                  ? "text-emerald-600"
                  : difference < 0
                    ? "text-destructive"
                    : "text-amber-600"
              }
            >
              {formatCurrency(difference)}
            </span>
          </p>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await closeCashierAction({
                  sessionId: session.id,
                  actualCashMinor: actual,
                });
                if (result.error) toast.error(result.error);
                else {
                  toast.success("Caja cerrada");
                  setSession({ ...session, status: "closed" });
                }
              })
            }
          >
            Cerrar turno
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
