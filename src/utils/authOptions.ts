import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { trackUserSignIn, trackUserSignOut } from "@/lib/supabaseUserProfileStore";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return true;

      try {
        await trackUserSignIn({
          email,
          name: user.name ?? null,
          avatarUrl: user.image ?? null,
          provider: account?.provider ?? null,
        });
      } catch (error) {
        // Login should not fail when profile sync is temporarily unavailable.
        console.error("Failed to track user sign-in:", error);
      }

      return true;
    },
    async session({ session }) {
      return session;
    },
  },
  events: {
    async signOut(message) {
      const sessionEmail = message.session?.user?.email?.trim().toLowerCase();
      const tokenEmail = typeof message.token?.email === "string" ? message.token.email.trim().toLowerCase() : "";
      const email = sessionEmail || tokenEmail;
      if (!email) return;
      try {
        await trackUserSignOut(email);
      } catch (error) {
        console.error("Failed to track user sign-out:", error);
      }
    },
  },
  theme: {
    colorScheme: "dark",
  },
};
