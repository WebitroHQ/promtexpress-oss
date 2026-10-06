import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, required, "aria-invalid": ariaInvalid, ...props }, ref) => {
    return (
      <input
        type={type}
        required={required}
        aria-required={required ? true : undefined}
        aria-invalid={ariaInvalid}
        className={cn(
          "flex h-10 w-full rounded-[var(--pe-r-md)] border border-border-strong bg-surface px-3 py-1 text-base text-text shadow-sm transition-all duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-faint focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 md:h-9 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
