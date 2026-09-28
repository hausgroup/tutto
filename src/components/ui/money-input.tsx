"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { formatCopInput, maskCopInput, parseCopInput } from "@/lib/utils/money";
import { cn } from "@/lib/utils";

type MoneyInputProps = Omit<
  ComponentProps<typeof Input>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  /** Numeric peso amount (same units as formatCurrency). */
  value: number;
  onValueChange: (value: number) => void;
  /** Allow decimal pesos with `,` (max 2). Default false for caja-style whole pesos. */
  allowDecimals?: boolean;
};

/**
 * COP money field: inserts thousand dots (and optional decimal commas) while typing.
 */
export function MoneyInput({
  value,
  onValueChange,
  allowDecimals = false,
  className,
  onBlur,
  onFocus,
  ...props
}: MoneyInputProps) {
  const maxFrac = allowDecimals ? 2 : 0;
  const [text, setText] = useState(() =>
    formatCopInput(value, { fractionDigits: maxFrac }),
  );

  useEffect(() => {
    const parsed = parseCopInput(text);
    if (parsed !== value) {
      setText(formatCopInput(value, { fractionDigits: maxFrac }));
    }
    // Only resync when the numeric value changes from outside.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- text is intentionally excluded
  }, [value, maxFrac]);

  return (
    <Input
      {...props}
      type="text"
      inputMode={allowDecimals ? "decimal" : "numeric"}
      autoComplete="off"
      className={cn("tabular-nums", className)}
      value={text}
      onChange={(event) => {
        const masked = maskCopInput(event.target.value, maxFrac);
        setText(masked === "" ? "" : masked);
        onValueChange(parseCopInput(masked || "0"));
      }}
      onBlur={(event) => {
        const next = parseCopInput(text || "0");
        const normalized = formatCopInput(next, { fractionDigits: maxFrac });
        setText(normalized);
        onValueChange(next);
        onBlur?.(event);
      }}
      onFocus={(event) => {
        event.target.select();
        onFocus?.(event);
      }}
    />
  );
}
