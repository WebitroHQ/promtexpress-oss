import { NextResponse } from "next/server";
import { consumeEmailVerifyToken } from "@/server/email/email-verify-token";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function publicOrigin(req: Request): string {
  const envUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  const fwdHost = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto");
  if (fwdHost) return `${fwdProto ?? "https"}://${fwdHost}`;
  return new URL(req.url).origin;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");
  const origin = publicOrigin(req);

  if (!token || !email) {
    return NextResponse.redirect(`${origin}/auth/verify?status=invalid`, { headers: NO_STORE_HEADERS });
  }

  const result = await consumeEmailVerifyToken(email, token);
  if (result.ok) {
    return NextResponse.redirect(`${origin}/generator?verified=1`, { headers: NO_STORE_HEADERS });
  }

  const status = result.reason === "expired" ? "expired" : "invalid";
  return NextResponse.redirect(
    `${origin}/auth/verify?status=${status}&email=${encodeURIComponent(email)}`,
    { headers: NO_STORE_HEADERS },
  );
}
