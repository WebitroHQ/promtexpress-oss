import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border transition-colors",
  {
    variants: {
      variant: {
        default: "bg-surface-2 text-text-muted border-border",
        primary: "bg-primary-soft text-primary border-transparent",
        accent: "bg-accent-soft text-accent border-transparent",
        success: "bg-success/15 text-success border-transparent",
        warning: "bg-warning/15 text-warning border-transparent",
        error: "bg-error/15 text-error border-transparent",
        outline: "text-text border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
