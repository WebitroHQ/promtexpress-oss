import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/feature/admin/admin-login-form";

export const metadata: Metadata = {
  title: "Admin sign in — PromtExpress",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="w-8 h-8 rounded-lg bg-primary text-primary-text inline-flex items-center justify-center text-sm font-semibold">
            p
          </span>
          <span className="font-semibold text-base">PromtExpress</span>
          <span className="ml-1 px-2 py-0.5 rounded text-[10px] font-bold bg-error/15 text-error">
            ADMIN
          </span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-7 shadow-md">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] mb-1">Admin sign in</h1>
          <p className="text-sm text-text-muted mb-6">
            This area is restricted. Use your admin credentials.
          </p>
          <AdminLoginForm />
        </div>

        <p className="text-center text-xs text-text-faint mt-6">
          Independent of user authentication.
        </p>
      </div>
    </div>
  );
}
