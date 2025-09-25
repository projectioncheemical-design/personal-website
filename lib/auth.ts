import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
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
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Single Admin short-circuit: accept admin email + password '0000' (or ADMIN_PASSWORD if provided)
        if (
          credentials.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
          (credentials.password === SINGLE_ADMIN_PASSWORD || (ADMIN_PASSWORD && credentials.password === ADMIN_PASSWORD))
        ) {
          // Ensure admin exists in DB
          let admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
          if (!admin) {
            admin = await prisma.user.create({
              data: {
                email: ADMIN_EMAIL,
                name: ADMIN_NAME,
                role: "ADMIN",
              },
            });
          }
          return { id: admin.id, email: admin.email!, name: admin.name || "Admin", role: admin.role } as any;
        }

        // Otherwise, disallow non-admin logins for now
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).role = (user as any).role;
        // NextAuth sets token.sub = user.id, but ensure we preserve it
        (token as any).id = (user as any).id ?? (token as any).sub;
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
