import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models";

const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

export const authOptions: NextAuthOptions = {
  secret: secret || "dev-only-change-in-production",
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  events: {
    async signIn({ user }) {
      if (!user?.id) return;
      try {
        await connectDB();
        await User.updateOne({ _id: user.id }, { $set: { lastLoginAt: new Date() } });
      } catch (e) {
        console.error("[next-auth] signIn lastLoginAt update failed", e);
      }
    },
  },
  pages: {
    signIn: "/login",
    /* Avoid bare /api/auth/error; send users to login with ?error=… so the UI can toast */
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;
        try {
          await connectDB();
          const user = await User.findOne({ email }).lean();
          if (!user?.passwordHash) return null;
          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) return null;
          return {
            id: String(user._id),
            email: user.email,
            name: user.name || "",
          };
        } catch (e) {
          console.error("[next-auth] authorize database error", e);
          throw new Error("AUTH_DB_UNAVAILABLE");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = (token.email as string) || session.user.email;
        if (token.name) session.user.name = token.name as string;
      }
      return session;
    },
  },
};
