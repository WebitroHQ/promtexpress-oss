import * as React from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
  /** Hide the wordmark text and render only the brand mark */
  markOnly?: boolean;
}

const SIZE_MAP = {
  sm: { mark: 20, text: "text-sm" },
  md: { mark: 26, text: "text-[17px]" },
  lg: { mark: 32, text: "text-xl" },
} as const;

export function Logo({ className, href = "/", size = "md", markOnly = false }: LogoProps) {
  const s = SIZE_MAP[size];

  const inner = (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight leading-none",
        s.text,
        className
      )}
    >
      <Image
        src="/brand/logo-mark.png"
        alt="PromtExpress"
        width={s.mark}
        height={s.mark}
        priority
        className="shrink-0"
      />
      {!markOnly && (
        <span aria-hidden="true">
          <span className="text-text">Promt</span>
          <span className="bg-gradient-to-r from-[#ff5722] via-[#e91e63] to-[#7c3aed] bg-clip-text text-transparent">
            Express
          </span>
        </span>
      )}
      {!markOnly && <span className="sr-only">PromtExpress</span>}
    </span>
  );

  return href ? (
    <Link href={href} aria-label="PromtExpress home">
      {inner}
    </Link>
  ) : (
    inner
  );
}
