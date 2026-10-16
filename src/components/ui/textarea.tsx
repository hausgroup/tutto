import * as React from "react"
import { cn } from "cn"
import { applyAutoCapitalizeChange } from "@/lib/utils/capitalize-input"

type TextareaProps = React.ComponentProps<"textarea"> & {
  capitalize?: "off" | "words" | "sentences"
}

function Textarea({
  className,
  onChange,
  capitalize = "sentences",
  ...props
}: TextareaProps) {
  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    if (capitalize !== "off") {
      applyAutoCapitalizeChange(event, capitalize)
    }
    onChange?.(event)
  }

  return (
    <textarea
      data-slot="textarea"
      autoCapitalize={
        capitalize === "off"
          ? "off"
          : capitalize === "words"
            ? "words"
            : "sentences"
      }
      onChange={handleChange}
      className={cn(
        "haus-input-control flex field-sizing-content min-h-16 w-full rounded-input border border-input-border bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
