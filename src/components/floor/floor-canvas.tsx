"use client";

import { cn } from "@/lib/utils";
import { FLOOR_CANVAS } from "@/lib/floor/types";
import type { ReactNode } from "react";

export function FloorCanvas({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("overflow-auto", className)}
    >
      <div
        className="relative bg-[radial-gradient(circle_at_1px_1px,oklch(0.75_0.02_85/0.15)_1px,transparent_0)] bg-size-[20px_20px] bg-[oklch(0.97_0.008_90)] dark:bg-[oklch(0.22_0.01_85)]"
        style={{
          width: FLOOR_CANVAS.width,
          height: FLOOR_CANVAS.height,
          maxWidth: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}
