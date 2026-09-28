import type { TableShape } from "@/lib/floor/types";

export type ChairLayout = {
  /** Percent of container width (0–100), center of chair */
  x: number;
  y: number;
  /** Degrees — chair faces toward table center */
  rotation: number;
  /** Which edge the half-circle sits on (salon illustration). */
  edge?: "top" | "bottom" | "left" | "right";
};

const clampCapacity = (capacity: number) =>
  Math.max(1, Math.min(30, Math.floor(capacity)));

/** Distribute `count` points along edge from (x1,y1) to (x2,y2) in percent space */
function alongEdge(
  count: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): ChairLayout[] {
  if (count <= 0) return [];
  if (count === 1) {
    return [
      {
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2,
        rotation: 0,
      },
    ];
  }
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 1) / (count + 1);
    return {
      x: x1 + (x2 - x1) * t,
      y: y1 + (y2 - y1) * t,
      rotation: 0,
    };
  });
}

function withEdgeRotation(
  chairs: ChairLayout[],
  rotation: number,
): ChairLayout[] {
  return chairs.map((c) => ({ ...c, rotation }));
}

function layoutCircle(capacity: number): ChairLayout[] {
  const n = clampCapacity(capacity);
  const cx = 50;
  const cy = 50;
  const radius = 38;
  return Array.from({ length: n }, (_, i) => {
    const angleDeg = -90 + (360 / n) * i;
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(angleRad),
      y: cy + radius * Math.sin(angleRad),
      rotation: angleDeg + 180,
    };
  });
}

function layoutSquare(capacity: number): ChairLayout[] {
  const n = clampCapacity(capacity);
  const perSide = Math.ceil(n / 4);
  const counts = [0, 0, 0, 0];
  let remaining = n;
  for (let s = 0; s < 4 && remaining > 0; s++) {
    const take = Math.min(perSide, remaining);
    counts[s] = take;
    remaining -= take;
  }

  const top = alongEdge(counts[0], 22, 12, 78, 12);
  const right = alongEdge(counts[1], 88, 22, 88, 78);
  const bottom = alongEdge(counts[2], 78, 88, 22, 88);
  const left = alongEdge(counts[3], 12, 78, 12, 22);

  return [
    ...withEdgeRotation(top, 180),
    ...withEdgeRotation(right, -90),
    ...withEdgeRotation(bottom, 0),
    ...withEdgeRotation(left, 90),
  ];
}

function layoutRectangle(capacity: number): ChairLayout[] {
  const n = clampCapacity(capacity);
  const longSide = Math.ceil(n / 2);
  const topCount = Math.ceil(longSide / 2);
  const bottomCount = n - topCount;
  const top = alongEdge(topCount, 18, 14, 82, 14);
  const bottom = alongEdge(bottomCount, 82, 86, 18, 86);
  return [
    ...withEdgeRotation(top, 180),
    ...withEdgeRotation(bottom, 0),
  ];
}

export function getChairLayouts(
  capacity: number,
  shape: TableShape,
): ChairLayout[] {
  switch (shape) {
    case "circle":
      return layoutCircle(capacity);
    case "square":
      return layoutSquare(capacity);
    case "rectangle":
    default:
      return layoutRectangle(capacity);
  }
}

/**
 * Uniform salon illustration: always 4 half-circle seats,
 * two on top and two on bottom — independent of capacity/shape.
 */
export function getSalonChairLayouts(): ChairLayout[] {
  return [
    { x: 34, y: 11, rotation: 0, edge: "top" },
    { x: 66, y: 11, rotation: 0, edge: "top" },
    { x: 34, y: 89, rotation: 0, edge: "bottom" },
    { x: 66, y: 89, rotation: 0, edge: "bottom" },
  ];
}

/** Uniform white card — slightly inset within the grid cell, 16px radius. */
export function getSalonTableSurfaceStyle(): {
  className: string;
  inset: string;
} {
  return {
    className: "rounded-[16px]",
    inset: "inset-x-[10%] inset-y-[15%]",
  };
}

export function getTableSurfaceStyle(shape: TableShape): {
  className: string;
  inset: string;
} {
  void shape;
  return getSalonTableSurfaceStyle();
}
