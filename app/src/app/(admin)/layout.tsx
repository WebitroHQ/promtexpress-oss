import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// DSK-4: meta-robots noindex parity with (app)/(auth) layouts. robots.txt
// already disallows /pr/yonet/, but robots.txt only blocks crawling, not
// indexing of discovered URLs — defense-in-depth so no admin URL is indexed
// even if linked externally. Covers the pre-session /pr/yonet/login page too.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Pathname injected by src/proxy.ts middleware as x-pathname header.
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";

  // /pr/yonet/login bypass — that page IS the admin sign-in form, must render without session.
  if (pathname === "/pr/yonet/login") {
    return <>{children}</>;
  }

  const session = await auth();
  if (!session) redirect("/pr/yonet/login");
  if (session.user?.role !== "ADMIN") redirect("/pr/yonet/login");

  return <>{children}</>;
}
