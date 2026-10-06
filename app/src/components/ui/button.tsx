import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-text shadow-sm hover:bg-primary-hover hover:shadow-md",
        secondary:
          "bg-surface text-text border border-border-strong hover:bg-surface-2",
        ghost:
          "bg-transparent text-text hover:bg-surface-2",
        outline:
          "border border-border-strong bg-transparent text-text hover:bg-surface-2",
        destructive:
          "bg-error text-primary-text shadow-sm hover:bg-error/90",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-xs rounded-[var(--pe-r-sm)] md:h-8",
        md: "h-10 px-4 text-sm rounded-[var(--pe-r-md)] md:h-9",
        lg: "h-11 px-6 text-sm rounded-[var(--pe-r-md)]",
        icon: "h-10 w-10 rounded-[var(--pe-r-md)] md:h-9 md:w-9",
        "icon-sm": "h-8 w-8 rounded-[var(--pe-r-sm)] md:h-7 md:w-7",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
