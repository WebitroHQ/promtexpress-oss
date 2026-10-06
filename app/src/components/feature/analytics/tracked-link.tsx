"use client";

import * as React from "react";
import Link, { type LinkProps } from "next/link";
import { trackEvent } from "@/lib/analytics/track";

interface Props extends LinkProps {
  eventName: string;
  eventMeta?: Record<string, unknown>;
  className?: string;
  children: React.ReactNode;
}

export function TrackedLink({ eventName, eventMeta, children, onClick, ...rest }: Props) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        trackEvent(eventName, eventMeta);
        if (onClick) onClick(e);
      }}
    >
      {children}
    </Link>
  );
}
