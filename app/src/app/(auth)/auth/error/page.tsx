import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

const ERROR_MESSAGES: Record<string, { title: string; body: string }> = {
  Configuration: {
    title: "Server configuration error",
    body: "There is a problem with the server configuration. Please contact support.",
  },
  AccessDenied: {
    title: "Access denied",
    body: "You do not have permission to sign in.",
  },
  Verification: {
    title: "Link expired",
    body: "The sign-in link has expired or has already been used. Please request a new one.",
  },
  Default: {
    title: "Something went wrong",
    body: "An error occurred during sign in. Please try again.",
  },
};

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function AuthErrorPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const msg = ERROR_MESSAGES[error ?? ""] ?? ERROR_MESSAGES.Default;

  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-[14px] bg-error/10 text-error inline-flex items-center justify-center mb-5">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="text-[28px] font-semibold tracking-[-0.025em] mb-2">{msg.title}</h1>
      <p className="text-sm text-text-muted mb-8 max-w-[300px] mx-auto">{msg.body}</p>
      <Button asChild>
        <Link href="/auth/login">Back to sign in</Link>
      </Button>
    </div>
  );
}
