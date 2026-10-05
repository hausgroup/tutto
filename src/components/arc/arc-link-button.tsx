import Link from "next/link";
import type { ComponentProps } from "react";
import buttonStyles from "@/components/arc/button/button.module.css";
import { cn } from "@/lib/utils";

type ArcButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ArcButtonSize = "sm" | "md" | "lg";

export function ArcLinkButton({
  href,
  variant = "secondary",
  size = "sm",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ArcButtonVariant;
  size?: ArcButtonSize;
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonStyles.button,
        buttonStyles[variant],
        buttonStyles[size],
        "no-underline",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
