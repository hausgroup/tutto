import * as React from "react"
import { cn } from "cn"
import {
  applyAutoCapitalizeChange,
  shouldAutoCapitalizeInput,
} from "@/lib/utils/capitalize-input"

type InputProps = React.ComponentProps<"input"> & {
  /** Auto-capitalize while typing. Default: words for text fields; off for email, search, etc. */
  capitalize?: "off" | "words" | "sentences"
}

function Input({
  className,
  type,
  onChange,
  capitalize,
  role,
  ...props
}: InputProps) {
  const capMode =
    capitalize === "off"
      ? null
      : capitalize ??
        (shouldAutoCapitalizeInput(type, role) ? "words" : null)

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (capMode) {
      applyAutoCapitalizeChange(event, capMode)
    }
    onChange?.(event)
  }

  return (
    <input
      type={type}
      role={role}
      data-slot="input"
      autoCapitalize={
        capMode === "words"
          ? "words"
          : capMode === "sentences"
            ? "sentences"
            : "off"
      }
      onChange={handleChange}
      className={cn(
        "haus-input-control h-11 w-full min-w-0 rounded-input border-0 bg-muted px-3.5 py-2 text-base text-foreground transition-colors outline-none ring-1 ring-input-border file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-2 aria-invalid:ring-destructive/40 md:text-sm dark:disabled:opacity-40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
