"use client";

import { signIn } from "next-auth/react";
import { Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SocialAuth() {
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        className="w-full justify-center"
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/generator" })}
      >
        <Chrome className="h-4 w-4" />
        Continue with Google
      </Button>
    </div>
  );
}
