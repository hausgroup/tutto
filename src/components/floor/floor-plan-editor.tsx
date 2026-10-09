"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createFloorAreaAction,
  createTableAction,
  deleteFloorAreaAction,
  deleteTableAction,
  renameFloorAreaAction,
  reorderFloorAreasAction,
  saveTableLayoutAction,
  saveTablePropertiesAction,
  type FloorActionState,
} from "@/lib/floor/actions";
import { FloorGridView } from "@/components/floor/floor-grid-view";
import { FloorZonePills } from "@/components/floor/floor-zone-pills";
import { ArcLinkButton } from "@/components/arc/arc-link-button";
import { Button } from "@/components/arc/button/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/arc/dialog/dialog";
import { Input } from "@/components/arc/input/input";
import { Select } from "@/components/arc/select/select";
import { Switch } from "@/components/arc/switch/switch";
import { TableStatusBadge } from "@/components/floor/table-status-badge";
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
import { PageHeaderActions } from "@/components/layout/page-header-actions";
import { cn } from "@/lib/utils";
import { Eye, Pencil, Plus, Trash2, X } from "lucide-react";

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
  const [renameAreaOpen, setRenameAreaOpen] = useState(false);
  const [renameAreaName, setRenameAreaName] = useState("");
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  const areas = useMemo(
    () => [...snapshot.areas].sort((a, b) => a.sortOrder - b.sortOrder),
    [snapshot.areas],
  );

  useEffect(() => {
    if (!areas.some((area) => area.id === activeAreaId)) {
      setActiveAreaId(areas[0]?.id ?? "");
    }
  }, [areas, activeAreaId]);

  const tablesForArea = useMemo(
    () => snapshot.tables.filter((table) => table.floorAreaId === activeAreaId),
    [snapshot.tables, activeAreaId],
  );

  const activeArea = areas.find((area) => area.id === activeAreaId);

  function applyAreaOrder(orderedAreaIds: string[]) {
    const orderMap = new Map(
      orderedAreaIds.map((id, index) => [id, index + 1]),
    );
    setSnapshot((current) => ({
      ...current,
      areas: current.areas.map((area) => ({
        ...area,
        sortOrder: orderMap.get(area.id) ?? area.sortOrder,
      })),
    }));
    startTransition(async () => {
      const result = await reorderFloorAreasAction({
        restaurantId,
        orderedAreaIds,
      });
      if (result.error) {
        toast.error(result.error);
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

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

  function runAction(promise: Promise<FloorActionState>) {
    startTransition(async () => {
      const result = await promise;
      if (result.error) {
        toast.error(result.error);
      }
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
    );
  }

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col gap-3", className)}>
      <PageHeaderActions>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ArcLinkButton href="/floor" variant="secondary" size="sm">
            <Eye className="size-4" />
            Ver salón
          </ArcLinkButton>
          <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm">
                <Plus className="size-4" />
                Área
              </Button>
            </DialogTrigger>
            <DialogContent title="Nueva área">
              <form
                className="flex flex-col gap-4"
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
                  setAreaDialogOpen(false);
                  router.refresh();
                }}
              >
                <Input id="area-name" name="name" label="Nombre" required />
                <div className="flex justify-end">
                  <Button type="submit" variant="primary">
                    Crear área
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={tableDialogOpen} onOpenChange={setTableDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm">
                <Plus className="size-4" />
                Mesa
              </Button>
            </DialogTrigger>
            <DialogContent title="Nueva mesa">
              <form
                className="flex flex-col gap-4"
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
                  setTableDialogOpen(false);
                  router.refresh();
                }}
              >
                <Input
                  id="table-label"
                  name="label"
                  label="Nombre / número"
                  required
                />
                <Input
                  id="table-capacity"
                  name="capacity"
                  label="Capacidad"
                  type="number"
                  min={1}
                  max={30}
                  defaultValue={4}
                  required
                />
                <div className="flex justify-end">
                  <Button type="submit" variant="primary">
                    Crear mesa
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={renameAreaOpen}
            onOpenChange={(open) => {
              setRenameAreaOpen(open);
              if (open && activeArea) setRenameAreaName(activeArea.name);
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                disabled={!activeAreaId}
              >
                <Pencil className="size-4" />
                Renombrar zona
              </Button>
            </DialogTrigger>
            <DialogContent title="Renombrar zona" className="max-w-sm">
              <div className="flex flex-col gap-4">
                <Input
                  id="rename-area-name"
                  label="Nombre"
                  value={renameAreaName}
                  onChange={(event) => setRenameAreaName(event.target.value)}
                  maxLength={80}
                  autoFocus
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => setRenameAreaOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    loading={pending}
                    disabled={!renameAreaName.trim()}
                    onClick={() =>
                      startTransition(async () => {
                        const name = renameAreaName.trim();
                        const result = await renameFloorAreaAction({
                          id: activeAreaId,
                          restaurantId,
                          name,
                        });
                        if (result.error) {
                          toast.error(result.error);
                          return;
                        }
                        setSnapshot((current) => ({
                          ...current,
                          areas: current.areas.map((area) =>
                            area.id === activeAreaId ? { ...area, name } : area,
                          ),
                        }));
                        setRenameAreaOpen(false);
                        router.refresh();
                      })
                    }
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="secondary"
            size="sm"
            disabled={pending || !activeAreaId}
            loading={pending}
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
              )
            }
          >
            <Trash2 className="size-4" />
            Eliminar área
          </Button>
        </div>
      </PageHeaderActions>

      <FloorZonePills
        areas={areas}
        activeAreaId={activeAreaId}
        onSelect={(areaId) => {
          setActiveAreaId(areaId);
          setSelectedTableId(null);
        }}
        reorderable
        onReorder={applyAreaOrder}
      />

      <div className="flex min-h-0 flex-1 flex-col">
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
      </div>

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
                size="sm"
                onClick={() => setSelectedTableId(null)}
                aria-label="Cerrar propiedades"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              <TableStatusBadge status={selectedTable.status} />
              <Input
                id="edit-label"
                label="Etiqueta"
                value={selectedTable.label}
                onChange={(event) =>
                  updateLocalTable({
                    ...selectedTable,
                    label: event.target.value,
                  })
                }
              />
              <Input
                id="edit-capacity"
                label="Capacidad"
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
              <Select
                label="Estado"
                value={getSalonMeta(selectedTable.status).tableStatus}
                onValueChange={(value) =>
                  updateLocalTable({
                    ...selectedTable,
                    status: value as RestaurantTable["status"],
                  })
                }
                options={SALON_EDITABLE_STATUSES.map((status) => ({
                  value: status,
                  label: getSalonMeta(status).label,
                }))}
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground">Activa</span>
                <Switch
                  id="edit-active"
                  aria-label="Activa"
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
                  variant="secondary"
                  loading={pending}
                  onClick={handlePropertySave}
                >
                  Guardar propiedades
                </Button>
                <Button
                  variant="danger"
                  loading={pending}
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
