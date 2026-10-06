"use client";

import { useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toggleEngineActive } from "@/server/actions/admin-engines";

export function EngineSwitch({
  engineId,
  enabled,
}: {
  engineId: string;
  enabled: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      defaultChecked={enabled}
      disabled={pending}
      onCheckedChange={(checked) =>
        startTransition(() => toggleEngineActive(engineId, checked))
      }
    />
  );
}
