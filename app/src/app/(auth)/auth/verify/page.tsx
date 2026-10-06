import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { VerifyForm } from "@/components/feature/auth/verify-form";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ email?: string; status?: string; from?: string }>;
}

export default async function VerifyPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await auth();

  if (session?.user?.emailVerified) {
    redirect("/generator?verified=1");
  }

  const email =
    (params.email && /.+@.+\..+/.test(params.email) ? params.email : null) ??
    session?.user?.email ??
    null;

  if (!email) {
    redirect("/auth/login");
  }

  const status =
    params.status === "expired" || params.status === "invalid" || params.status === "sent"
      ? params.status
      : null;

  return <VerifyForm email={email} status={status} />;
}
