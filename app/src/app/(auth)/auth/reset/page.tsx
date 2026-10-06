import { Suspense } from "react";
import { ResetForm } from "@/components/feature/auth/reset-form";

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
