"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Visual match for `Button variant="outline" size="sm"`. */
export const catalogSearchInputClassName =
  "border-0 bg-background shadow-none ring-1 ring-border rounded-full text-sm text-foreground placeholder:text-muted-foreground/55 hover:bg-background focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-card";

export function CatalogSearchField({
  value,
  onChange,
  onClear,
  className,
  inputClassName,
  placeholder = "Buscar platos, bebidas, SKU…",
  "aria-label": ariaLabel = "Buscar en el menú",
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  "aria-label"?: string;
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/70"
        aria-hidden
      />
      <Input
        type="text"
        role="searchbox"
        inputMode="search"
        autoComplete="off"
        data-pill
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          catalogSearchInputClassName,
          "h-9 py-0 pl-9 pr-9",
          inputClassName,
        )}
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
          aria-label="Limpiar búsqueda"
          onClick={onClear}
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
