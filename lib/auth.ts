/**
 * NextAuth configuration
 * Authentication: Admission Number + Password via Firestore
 * No public registration — users are preloaded by admins.
 */

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByAdmissionNumber, verifyPassword } from "@/lib/firestore/auth";
import { FirestoreUser } from "@/lib/firebase/collections";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        admissionNumber: { label: "Admission Number", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.admissionNumber || !credentials?.password) {
          return null;
        }

        const adm = credentials.admissionNumber.trim().toUpperCase();
        let user: (FirestoreUser & { docId: string }) | null = null;

        try {
          user = await getUserByAdmissionNumber(adm);
        } catch (err) {
          console.error("[auth] Firestore lookup failed:", err);
          return null;
        }

        if (!user) return null;

        if (user.status === "DISABLED") {
          throw new Error("ACCOUNT_DISABLED");
        }

        const valid = await verifyPassword(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.docId,
          name: user.name,
          email: user.email ?? "",
          admissionNumber: user.admissionNumber,
          department: user.department,
          semester: user.semester,
          role: user.role,
          locationId: user.locationId ?? null,
          firstLogin: user.firstLogin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // `user` is only present on initial sign-in
      if (user) {
        token.id = user.id;
        token.admissionNumber = (user as any).admissionNumber;
        token.department = (user as any).department;
        token.semester = (user as any).semester;
        token.role = (user as any).role;
        token.locationId = (user as any).locationId ?? null;
        token.firstLogin = (user as any).firstLogin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.admissionNumber = token.admissionNumber as string;
        session.user.department = token.department as string;
        session.user.semester = token.semester as number;
        session.user.role = token.role as "STUDENT" | "ADMIN" | "SUPER_ADMIN";
        session.user.locationId = token.locationId as string | null;
        session.user.firstLogin = token.firstLogin as boolean;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return baseUrl;
    },
  },
};
