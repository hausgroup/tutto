"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { adjustInventoryAction } from "@/lib/inventory/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InventoryAdjustForm({ ingredientId }: { ingredientId: string }) {
  const [delta, setDelta] = useState("0");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const quantityDelta = Number(delta);
          const result = await adjustInventoryAction({
            ingredientId,
            quantityDelta,
            notes: "Ajuste manual",
          });
          if (result.error) toast.error(result.error);
          else toast.success("Stock actualizado");
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor={`delta-${ingredientId}`}>Ajuste (+/-)</Label>
        <Input
          id={`delta-${ingredientId}`}
          type="number"
          step="0.001"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          className="w-28"
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        Aplicar
      </Button>
    </form>
  );
}
