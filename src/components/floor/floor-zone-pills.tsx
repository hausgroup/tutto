"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import type { FloorArea } from "@/lib/floor/types";
import { cn } from "@/lib/utils";

const EMPTY_DRAG_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function reorderIds(ids: string[], dragId: string, overId: string) {
  if (dragId === overId) return ids;
  const from = ids.indexOf(dragId);
  const to = ids.indexOf(overId);
  if (from === -1 || to === -1) return ids;
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, dragId);
  return next;
}

export function FloorZonePills({
  areas,
  activeAreaId,
  onSelect,
  reorderable = false,
  onReorder,
  className,
}: {
  areas: FloorArea[];
  activeAreaId: string;
  onSelect: (areaId: string) => void;
  reorderable?: boolean;
  onReorder?: (orderedAreaIds: string[]) => void;
  className?: string;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dragGhost, setDragGhost] = useState<{
    areaId: string;
    x: number;
    y: number;
  } | null>(null);

  if (areas.length === 0) return null;

  function handleDrop(targetId: string) {
    if (!draggingId || !reorderable || !onReorder) return;
    const next = reorderIds(
      areas.map((area) => area.id),
      draggingId,
      targetId,
    );
    onReorder(next);
    setDraggingId(null);
    setOverId(null);
    setDragGhost(null);
  }

  function endDrag() {
    setDraggingId(null);
    setOverId(null);
    setDragGhost(null);
  }

  const ghostArea = dragGhost
    ? areas.find((area) => area.id === dragGhost.areaId)
    : null;

  return (
    <>
      <div
        className={cn("flex flex-wrap items-center gap-2", className)}
        role="tablist"
        aria-label="Zonas del salón"
      >
        {areas.map((area) => {
          const active = area.id === activeAreaId;
          const isSource = draggingId === area.id;

          return (
            <div
              key={area.id}
              className="flex items-center"
              onDragOver={(event) => {
                if (!reorderable || !draggingId) return;
                event.preventDefault();
                setOverId(area.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(area.id);
              }}
              onDragLeave={() => {
                if (overId === area.id) setOverId(null);
              }}
            >
              {reorderable ? (
                <span
                  draggable
                  onDragStart={(event) => {
                    setDraggingId(area.id);
                    setDragGhost({
                      areaId: area.id,
                      x: event.clientX,
                      y: event.clientY,
                    });
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", area.id);
                    const img = new Image();
                    img.src = EMPTY_DRAG_IMAGE;
                    event.dataTransfer.setDragImage(img, 0, 0);
                  }}
                  onDrag={(event) => {
                    if (event.clientX === 0 && event.clientY === 0) return;
                    setDragGhost({
                      areaId: area.id,
                      x: event.clientX,
                      y: event.clientY,
                    });
                  }}
                  onDragEnd={endDrag}
                  className={cn(
                    "mr-0.5 flex cursor-grab touch-none items-center text-muted-foreground active:cursor-grabbing",
                    isSource && "opacity-40",
                  )}
                  aria-hidden
                >
                  <GripVertical className="size-4" />
                </span>
              ) : null}
              <Button
                type="button"
                role="tab"
                aria-selected={active}
                variant={active ? "primary" : "secondary"}
                size="sm"
                className={cn(isSource && "opacity-40")}
                onClick={() => onSelect(area.id)}
              >
                {area.name}
              </Button>
            </div>
          );
        })}
      </div>
      {ghostArea && dragGhost ? (
        <div
          className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-1/2 shadow-md"
          style={{ left: dragGhost.x, top: dragGhost.y }}
          aria-hidden
        >
          <Button
            type="button"
            variant={
              ghostArea.id === activeAreaId ? "primary" : "secondary"
            }
            size="sm"
            tabIndex={-1}
          >
            {ghostArea.name}
          </Button>
        </div>
      ) : null}
    </>
  );
}
