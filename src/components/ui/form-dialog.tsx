"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const formDialogContentClassName =
  "flex max-h-[min(92dvh,36rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md";

export const formDialogHeaderClassName =
  "border-b border-border/60 px-5 py-4 text-left";

export const formDialogTitleClassName = "text-base font-semibold";

export const formDialogBodyClassName =
  "min-h-0 flex-1 overflow-y-auto px-5 py-4";

export const formDialogFooterClassName =
  "mx-0 mb-0 mt-0 flex shrink-0 flex-row items-center justify-end gap-2 rounded-none border-t border-border/60 bg-muted/40 px-5 py-3";

/** Full-width select trigger aligned with modal inputs. */
export const formSelectTriggerClassName =
  "h-11 w-full rounded-input border-0 bg-muted shadow-none ring-1 ring-input-border focus:ring-2 focus:ring-ring data-[size=default]:h-11 dark:bg-muted";

export function FormDialogContent({
  className,
  ...props
}: ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(formDialogContentClassName, className)}
      {...props}
    />
  );
}

export function FormDialogHeader({
  className,
  ...props
}: ComponentProps<typeof DialogHeader>) {
  return (
    <DialogHeader className={cn(formDialogHeaderClassName, className)} {...props} />
  );
}

export function FormDialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogTitle>) {
  return (
    <DialogTitle className={cn(formDialogTitleClassName, className)} {...props} />
  );
}

export function FormDialogBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(formDialogBodyClassName, className)}>{children}</div>
  );
}

export function FormDialogFooter({
  className,
  ...props
}: ComponentProps<typeof DialogFooter>) {
  return (
    <DialogFooter className={cn(formDialogFooterClassName, className)} {...props} />
  );
}
