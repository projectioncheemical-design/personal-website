import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcrypt";

// Environment-driven admin configuration
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "elsiaad.motawee@gmail.com";
const ADMIN_NAME = process.env.ADMIN_NAME || "Projection";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SINGLE_ADMIN_PASSWORD = "0000"; // requested simplified password

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email!, name: user.name || undefined, role: user.role } as any;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        // Let PrismaAdapter create/find the user; role defaults to REQUESTER from Prisma schema
        return {
          id: profile.sub as string,
          name: profile.name || profile.email?.split("@")[0] || "User",
          email: profile.email,
          image: (profile as any).picture,
        } as any;
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      try {
        const email = (user as any)?.email?.toLowerCase?.();
        const adminEmail = (process.env.ADMIN_EMAIL || "elsiaad.motawee@gmail.com").toLowerCase();
        if (email && email === adminEmail) {
          const existing = await prisma.user.findUnique({ where: { email } });
          if (existing && existing.role !== "ADMIN") {
            await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
          }
        }
      } catch (e) {
        console.error("NextAuth signIn admin promotion error", e);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        (token as any).role = (user as any).role;
        // NextAuth sets token.sub = user.id, but ensure we preserve it
        (token as any).id = (user as any).id ?? (token as any).sub;
      }
      // Ensure we always carry latest role from DB (handles promotions post-signin)
      try {
        const userId = (token as any).id ?? (token as any).sub;
        if (userId) {
          const dbUser = await prisma.user.findUnique({ where: { id: String(userId) }, select: { id: true, role: true } });
          if (dbUser) {
            (token as any).id = dbUser.id;
            (token as any).role = dbUser.role;
          }
        }
      } catch (e) {
        // ignore silently; token still works
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = (token as any).role as string | undefined;
        (session.user as any).id = (token as any).id ?? (token as any).sub;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret",
};
