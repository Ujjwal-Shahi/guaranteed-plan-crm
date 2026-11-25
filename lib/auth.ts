import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./db";

const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN ?? "nobroker.in";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google" && profile?.email) {
        const email = profile.email.toLowerCase();
        if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) return false;
        // Exited / deactivated agents lose access the same day; unknown emails may still sign in.
        const agent = await prisma.agent.findUnique({
          where: { email },
          select: { isActive: true, deletedAt: true },
        });
        return !agent || (agent.isActive && !agent.deletedAt);
      }
      return false;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
};
