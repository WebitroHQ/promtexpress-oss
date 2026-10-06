"use client";

import * as React from "react";
import { GeneratorClient } from "@/components/feature/generator/generator-client";

interface TargetEngineOption {
  id: string;
  slug: string;
  name: string;
  provider: string | null;
  modality: string;
  sortOrder: number;
  iconUrl?: string | null;
  createdAt?: string | Date;
  tier?: string | null;
  capabilities?: string[] | null;
  releasedAt?: string | Date | null;
  brandColor?: string | null;
}

interface Props {
  isAuthenticated: boolean;
  targetEngines: TargetEngineOption[];
}

/**
 * Ana sayfa "Live Demo" — /generator ile bire bir aynı UI ve davranış.
 * Sadece Screen 1'i gösterir; "Devam Et"e basıldığında girdi sessionStorage'a
 * kaydedilir ve misafir → /auth/signup, üye → /generator yönlendirilir.
 */
export function DemoWidget({ isAuthenticated, targetEngines }: Props) {
  return (
    <GeneratorClient
      mode="demo"
      isAuthenticated={isAuthenticated}
      targetEngines={targetEngines}
    />
  );
}
