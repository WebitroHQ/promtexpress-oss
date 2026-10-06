import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/db/client";
import { sendTemplateEmail } from "@/server/email/template-send";
import { grantWelcomeCredit } from "@/lib/onboarding/grant-welcome-credit";
import { headers as nextHeaders } from "next/headers";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "database",
    maxAge: 60 * 60 * 24 * 30, // 30 days — matches manual SESSION_TTL_DAYS in sessions.ts
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      // Aynı email'e sahip mevcut User'ı (magic link / şifre ile açılmış) otomatik linkle.
      // Google verified-email garantisi verdiği için güvenli.
      allowDangerousEmailAccountLinking: true,
    }),
    Nodemailer({
      server: {
        host: "smtp-relay.brevo.com",
        port: 587,
        auth: {
          user: process.env.BREVO_SMTP_USER!,
          pass: process.env.BREVO_SMTP_PASS!,
        },
      },
      from: process.env.EMAIL_FROM!,
      // Override: use admin-managed EmailTemplate ("verification") instead of default HTML.
      async sendVerificationRequest({ identifier: email, url }) {
        // Try to detect locale from existing User row; fallback to "en".
        const u = await db.user.findUnique({ where: { email }, select: { locale: true, name: true } });
        const result = await sendTemplateEmail({
          slug: "verification",
          locale: u?.locale ?? "en",
          to: email,
          vars: {
            name: u?.name ?? email.split("@")[0]!,
            verifyUrl: url,
          },
        });
        if (!result.ok) {
          throw new Error(`Verification email failed: ${result.reason}`);
        }
      },
    }),
  ],
  events: {
    async createUser({ user }) {
      // Welcome email on first signup (after OAuth or magic link)
      if (user.email) {
        // user.locale isn't typed by NextAuth — read from DB row.
        const row = user.id
          ? await db.user.findUnique({ where: { id: user.id }, select: { locale: true } })
          : null;
        await sendTemplateEmail({
          slug: "welcome",
          locale: row?.locale ?? "en",
          to: user.email,
          vars: {
            name: user.name ?? user.email.split("@")[0]!,
          },
        });
      }

      // Hosgeldin kredisi (idempotent): OAuth + magic-link kayitlari icin de calisir.
      if (user.id) {
        try {
          await grantWelcomeCredit(user.id);
        } catch {
          // best-effort
        }
      }

      // Anti-abuse: signup-time IP/UA/fingerprint sinyallerini kaydet (best-effort).
      if (user.id) {
        try {
          const h = await nextHeaders();
          const ip =
            h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            h.get("x-real-ip") ||
            null;
          const userAgent = h.get("user-agent") || null;
          const cookieStr = h.get("cookie") || "";
          const fpMatch = cookieStr.match(/(?:^|;\s*)pe\.fp=([^;]+)/);
          const fingerprint = fpMatch?.[1] ?? null;

          await db.signupSignal.upsert({
            where: { userId: user.id },
            create: { userId: user.id, ip, userAgent, fingerprint },
            update: {},
          });
        } catch {
          // Sessizce yut — auth akışını bloklamaz.
        }
      }
    },
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role ?? "USER";
      session.user.emailVerified = user.emailVerified ?? null;
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    verifyRequest: "/auth/verify",
    error: "/auth/error",
  },
});
