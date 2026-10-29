/**
 * NextAuth configuration (P-09).
 * Authentication: Admission Number + Password via Firestore
 *
 * Security features:
 * - Fail-fast validation of NEXTAUTH_URL and NEXTAUTH_SECRET at startup.
 * - Rate limits login attempts per admission number AND per IP (5 attempts / 15 mins).
 * - Dummy bcrypt compare on non-existent or disabled users to equalize timing.
 * - Session lifetime of 8 hours.
 * - Session freshness: re-reads user from Firestore every 60s in the JWT callback.
 * - Immediate session revocation on user disable or password change (passwordChangedAt).
 * - Secure, httpOnly, sameSite=lax cookies in production.
 * - Strictly same-origin relative redirects.
 */

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByAdmissionNumber, getUserById, verifyPassword } from "@/lib/firestore/auth";
import { FirestoreUser } from "@/lib/firebase/collections";
import { isRateLimited, recordRateLimitFailure, resetRateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

// Startup validation: fail fast in production if required NextAuth variables are missing
if (process.env.NODE_ENV === "production") {
  if (!process.env.NEXTAUTH_URL) {
    throw new Error("Missing required environment variable: NEXTAUTH_URL");
  }
  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error("Missing required environment variable: NEXTAUTH_SECRET");
  }
}

// Pre-computed dummy hash to equalize timing when user is not found
const DUMMY_HASH = "$2a$12$e80yqZ6u9.gH9gX88h3jbeE9qXW5pD3UeP69fJqR1t4K5vM6/2e0y";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours (P-09)
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
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
      async authorize(credentials, req) {
        if (!credentials?.admissionNumber || !credentials?.password) {
          return null;
        }

        const adm = credentials.admissionNumber.trim().toUpperCase();

        // Extract client IP address for dual-layer rate limiting
        const forwarded = (req?.headers as Record<string, any> | undefined)?.["x-forwarded-for"];
        const ip =
          (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : null) ||
          (req?.headers as Record<string, any> | undefined)?.["x-real-ip"] ||
          "127.0.0.1";

        const userKey = `login:user:${adm}`;
        const ipKey = `login:ip:${ip}`;

        // 1. Check rate limits: 5 attempts in 15 minutes (900 seconds)
        const userLock = await isRateLimited(userKey, 5, 900);
        const ipLock = await isRateLimited(ipKey, 5, 900);

        if (userLock.locked || ipLock.locked) {
          const retrySec = Math.max(userLock.retryAfterSeconds, ipLock.retryAfterSeconds, 1);
          throw new Error(
            `Too many failed login attempts. Account is locked. Please try again in ${Math.ceil(retrySec / 60)} minutes.`
          );
        }

        let user: (FirestoreUser & { docId: string }) | null = null;
        try {
          user = await getUserByAdmissionNumber(adm);
        } catch (err) {
          logger.error("[auth] Firestore lookup failed:", err);
          return null;
        }

        // 2. Dummy compare when user is not found to prevent timing-based user enumeration
        if (!user) {
          await verifyPassword(credentials.password, DUMMY_HASH);
          await recordRateLimitFailure(userKey, 5, 900);
          await recordRateLimitFailure(ipKey, 5, 900);
          return null;
        }

        // 3. Dummy compare when user is disabled (same generic rejection)
        if (user.status === "DISABLED") {
          await verifyPassword(credentials.password, DUMMY_HASH);
          await recordRateLimitFailure(userKey, 5, 900);
          await recordRateLimitFailure(ipKey, 5, 900);
          return null;
        }

        // 4. Verify password against real hash
        const valid = await verifyPassword(credentials.password, user.passwordHash);
        if (!valid) {
          await recordRateLimitFailure(userKey, 5, 900);
          await recordRateLimitFailure(ipKey, 5, 900);
          return null;
        }

        // 5. Reset failure counters on successful login
        await resetRateLimit(userKey);
        await resetRateLimit(ipKey);

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
      // User is passed only on initial sign-in
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.admissionNumber = user.admissionNumber;
        token.department = user.department;
        token.semester = user.semester;
        token.role = user.role;
        token.locationId = user.locationId ?? null;
        token.firstLogin = user.firstLogin;
        token.lastChecked = Date.now();
        return token;
      }

      // Re-read user from Firestore cached for 60 seconds (P-09)
      const now = Date.now();
      if (token.id && now - (token.lastChecked ?? 0) > 60_000) {
        try {
          const freshUser = await getUserById(token.id);

          // If user was deleted or disabled, invalidate session token
          if (!freshUser || freshUser.status === "DISABLED") {
            return {} as any;
          }

          // If password was changed after token issuance, invalidate session
          if (freshUser.passwordChangedAt && typeof token.iat === "number") {
            const changedSec = freshUser.passwordChangedAt.seconds;
            if (token.iat < changedSec) {
              return {} as any;
            }
          }

          // Refresh permissions, role, and location
          token.role = freshUser.role;
          token.locationId = freshUser.locationId ?? null;
          token.firstLogin = freshUser.firstLogin;
          token.name = freshUser.name;
          token.department = freshUser.department;
          token.semester = freshUser.semester;
          token.lastChecked = now;
        } catch (err) {
          logger.warn("[auth] Failed to refresh user in JWT callback:", err);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (!token || !token.id) {
        return null as any;
      }

      if (session.user) {
        session.user.id = token.id;
        session.user.name = token.name ?? "";
        session.user.email = token.email ?? "";
        session.user.admissionNumber = token.admissionNumber;
        session.user.department = token.department;
        session.user.semester = token.semester;
        session.user.role = token.role as "STUDENT" | "ADMIN" | "SUPER_ADMIN";
        session.user.locationId = token.locationId;
        session.user.firstLogin = token.firstLogin;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs strictly on the same origin
      try {
        const parsed = new URL(url);
        if (parsed.origin === baseUrl) return url;
      } catch {
        // ignore invalid urls
      }
      return baseUrl;
    },
  },
};
