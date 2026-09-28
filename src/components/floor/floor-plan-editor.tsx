"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createFloorAreaAction,
  createTableAction,
  deleteFloorAreaAction,
  deleteTableAction,
  saveTableLayoutAction,
  saveTablePropertiesAction,
  type FloorActionState,
} from "@/lib/floor/actions";
import { FloorGridView } from "@/components/floor/floor-grid-view";
import { TableStatusBadge } from "@/components/floor/table-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type {
  FloorArea,
  FloorSnapshot,
  RestaurantTable,
} from "@/lib/floor/types";
import {
  SALON_EDITABLE_STATUSES,
  getSalonMeta,
} from "@/lib/floor/status";
import {
  FLOOR_TABLE_SLOT_SIZE,
  gridCellToPosition,
  tableToGridCell,
  type GridCell,
} from "@/lib/floor/floor-grid";
import { cn } from "@/lib/utils";
import { Eye, Plus, Trash2, X } from "lucide-react";

export function FloorPlanEditor({
  initialSnapshot,
  restaurantId,
  className,
}: {
  initialSnapshot: FloorSnapshot;
  restaurantId: string;
  className?: string;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [activeAreaId, setActiveAreaId] = useState(
    initialSnapshot.areas[0]?.id ?? "",
  );
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  const areas = useMemo(
    () => [...snapshot.areas].sort((a, b) => a.sortOrder - b.sortOrder),
    [snapshot.areas],
  );

  const tablesForArea = useMemo(
    () => snapshot.tables.filter((table) => table.floorAreaId === activeAreaId),
    [snapshot.tables, activeAreaId],
  );

  const selectedTable =
    snapshot.tables.find((table) => table.id === selectedTableId) ?? null;

  function updateLocalTable(table: RestaurantTable) {
    setSnapshot((current) => ({
      ...current,
      tables: current.tables.map((item) =>
        item.id === table.id ? table : item,
      ),
    }));
  }

  function updateLocalTables(nextTables: RestaurantTable[]) {
    const byId = new Map(nextTables.map((table) => [table.id, table]));
    setSnapshot((current) => ({
      ...current,
      tables: current.tables.map((item) => byId.get(item.id) ?? item),
    }));
  }

  function runAction(promise: Promise<FloorActionState>, successMessage: string) {
    startTransition(async () => {
      const result = await promise;
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
    });
  }

  function applyLayout(
    table: RestaurantTable,
    cell: GridCell,
  ): RestaurantTable {
    const position = gridCellToPosition(cell);
    return {
      ...table,
      posX: position.posX,
      posY: position.posY,
      width: FLOOR_TABLE_SLOT_SIZE,
      height: FLOOR_TABLE_SLOT_SIZE,
      rotationDeg: 0,
      shape: "square",
    };
  }

  async function saveLayouts(tables: RestaurantTable[]) {
    // Fire-and-forget: local grid already updated; don't block UI with pending/revalidate.
    void Promise.all(
      tables.map((table) =>
        saveTableLayoutAction({
          id: table.id,
          restaurantId,
          posX: table.posX,
          posY: table.posY,
          width: table.width,
          height: table.height,
          rotationDeg: table.rotationDeg,
        }),
      ),
    ).then((results) => {
      const failed = results.find((result) => result.error);
      if (failed?.error) toast.error(failed.error);
    });
  }

  function tableAtCell(cell: GridCell, exceptId?: string) {
    return tablesForArea.find((item) => {
      if (exceptId && item.id === exceptId) return false;
      const current = tableToGridCell(item);
      return current.col === cell.col && current.row === cell.row;
    });
  }

  function moveTableToCell(table: RestaurantTable, cell: GridCell) {
    const fromCell = tableToGridCell(table);
    if (fromCell.col === cell.col && fromCell.row === cell.row) {
      setSelectedTableId(table.id);
      return;
    }

    const other = tableAtCell(cell, table.id);
    if (other) {
      const moved = applyLayout(table, cell);
      const swapped = applyLayout(other, fromCell);
      updateLocalTables([moved, swapped]);
      setSelectedTableId(moved.id);
      void saveLayouts([moved, swapped]);
      return;
    }

    const next = applyLayout(table, cell);
    updateLocalTable(next);
    setSelectedTableId(table.id);
    void saveLayouts([next]);
  }

  function handleEmptySlotClick(cell: GridCell) {
    if (!selectedTable) {
      toast.message("Arrastra una mesa o selecciónala y toca una casilla vacía.");
      return;
    }
    moveTableToCell(selectedTable, cell);
  }

  function handleDropToCell(tableId: string, cell: GridCell) {
    const table = tablesForArea.find((item) => item.id === tableId);
    if (!table) return;
    moveTableToCell(table, cell);
  }

  function handlePropertySave() {
    if (!selectedTable) return;
    runAction(
      saveTablePropertiesAction({
        id: selectedTable.id,
        restaurantId,
        label: selectedTable.label,
        capacity: selectedTable.capacity,
        shape: "square",
        status: selectedTable.status,
        floorAreaId: selectedTable.floorAreaId,
        isActive: selectedTable.isActive,
      }),
      "Mesa actualizada",
    );
  }

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col gap-3", className)}>
      <Tabs
        value={activeAreaId}
        onValueChange={(value) => {
          setActiveAreaId(value);
          setSelectedTableId(null);
        }}
        className="flex min-h-0 flex-1 flex-col gap-3"
      >
        <div className="flex shrink-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="h-auto w-full justify-start lg:w-auto">
            {areas.map((area) => (
              <TabsTrigger key={area.id} value={area.id}>
                {area.name}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/floor">
                <Eye className="size-4" />
                Ver salón
              </Link>
            </Button>
            <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="size-4" />
                  Área
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form
                  action={async (formData) => {
                    formData.set("restaurantId", restaurantId);
                    const result = await createFloorAreaAction({}, formData);
                    if (result.error) {
                      toast.error(result.error);
                      return;
                    }
                    if (result.area) {
                      setSnapshot((current) => ({
                        ...current,
                        areas: [...current.areas, result.area as FloorArea],
                      }));
                      setActiveAreaId(result.area.id);
                    }
                    toast.success("Área creada");
                    setAreaDialogOpen(false);
                    router.refresh();
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>Nueva área</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <Label htmlFor="area-name">Nombre</Label>
                    <Input id="area-name" name="name" required />
                  </div>
                  <DialogFooter>
                    <Button type="submit" variant="outline">
                      Crear área
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={tableDialogOpen} onOpenChange={setTableDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="size-4" />
                  Mesa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    formData.set("restaurantId", restaurantId);
                    formData.set("floorAreaId", activeAreaId);
                    formData.set("shape", "square");
                    const result = await createTableAction({}, formData);
                    if (result.error) {
                      toast.error(result.error);
                      return;
                    }
                    if (result.table) {
                      setSnapshot((current) => ({
                        ...current,
                        tables: [...current.tables, result.table as RestaurantTable],
                      }));
                      setSelectedTableId(result.table.id);
                    }
                    toast.success("Mesa creada");
                    setTableDialogOpen(false);
                    router.refresh();
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>Nueva mesa</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="table-label">Nombre / número</Label>
                      <Input id="table-label" name="label" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="table-capacity">Capacidad</Label>
                      <Input
                        id="table-capacity"
                        name="capacity"
                        type="number"
                        min={1}
                        max={30}
                        defaultValue={4}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" variant="outline">
                      Crear mesa
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              disabled={pending || !activeAreaId}
              onClick={() =>
                runAction(
                  deleteFloorAreaAction({
                    id: activeAreaId,
                    restaurantId,
                  }).then((result) => {
                    if (!result.error) {
                      setSelectedTableId(null);
                      router.refresh();
                    }
                    return result;
                  }),
                  "Área eliminada",
                )
              }
            >
              <Trash2 className="size-4" />
              Eliminar área
            </Button>
          </div>
        </div>

        {areas.map((area) => (
          <TabsContent
            key={area.id}
            value={area.id}
            className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
          >
            <FloorGridView
              tables={tablesForArea}
              selectedTableId={selectedTableId}
              onSelect={(table) => setSelectedTableId(table.id)}
              editable
              allowInactive
              onEmptySlotClick={handleEmptySlotClick}
              onDropToCell={handleDropToCell}
              emptyLabel="Agrega una mesa para empezar a armar el plano."
              className="min-h-[min(70vh,calc(100dvh-12rem))]"
            />
            <p className="mt-2 shrink-0 text-xs text-muted-foreground">
              Arrastra una mesa a una casilla vacía o sobre otra mesa para
              intercambiar. También puedes seleccionar y tocar una casilla.
            </p>
          </TabsContent>
        ))}
      </Tabs>

      <aside
        className={cn(
          "pointer-events-none absolute inset-x-3 bottom-3 z-20 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-16 sm:w-[min(100%,20rem)]",
          selectedTable ? "pointer-events-auto" : "hidden",
        )}
      >
        {selectedTable ? (
          <div className="pointer-events-auto max-h-[min(70dvh,32rem)] overflow-y-auto rounded-xl border bg-card/95 p-4 shadow-xl backdrop-blur-md supports-[backdrop-filter]:bg-card/90">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium">Propiedades</h3>
                <p className="text-xs text-muted-foreground">
                  Mesa {selectedTable.label}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setSelectedTableId(null)}
                aria-label="Cerrar propiedades"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <TableStatusBadge status={selectedTable.status} />
              <div className="space-y-2">
                <Label htmlFor="edit-label">Etiqueta</Label>
                <Input
                  id="edit-label"
                  value={selectedTable.label}
                  onChange={(event) =>
                    updateLocalTable({
                      ...selectedTable,
                      label: event.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-capacity">Capacidad</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  min={1}
                  max={30}
                  value={selectedTable.capacity}
                  onChange={(event) =>
                    updateLocalTable({
                      ...selectedTable,
                      capacity: Number(event.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={getSalonMeta(selectedTable.status).tableStatus}
                  onValueChange={(value) =>
                    updateLocalTable({
                      ...selectedTable,
                      status: value as RestaurantTable["status"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SALON_EDITABLE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {getSalonMeta(status).label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-active">Activa</Label>
                <Switch
                  id="edit-active"
                  checked={selectedTable.isActive}
                  onCheckedChange={(checked) =>
                    updateLocalTable({
                      ...selectedTable,
                      isActive: checked,
                    })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={handlePropertySave}
                >
                  Guardar propiedades
                </Button>
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    runAction(
                      deleteTableAction({
                        id: selectedTable.id,
                        restaurantId,
                      }).then((result) => {
                        if (!result.error) {
                          setSelectedTableId(null);
                          router.refresh();
                        }
                        return result;
                      }),
                      "Mesa eliminada",
                    )
                  }
                >
                  <Trash2 className="size-4" />
                  Eliminar mesa
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
