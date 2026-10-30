/**
 * Application Middleware (P-09).
 * Powered by NextAuth withAuth.
 *
 * Security enforcement:
 * - Protects /student/**, /admin/**, /dashboard/**, and /api/** (excluding public allowlist).
 * - Enforces firstLogin: users with firstLogin === true can ONLY reach /first-login and /api/auth/change-password.
 * - Enforces role boundaries: /admin/** strictly requires ADMIN or SUPER_ADMIN role.
 * - Returns JSON 401 for unauthorized API requests rather than HTML login redirects.
 */

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Public routes that never require authentication
const PUBLIC_API_ALLOWLIST = [
  "/api/payment/razorpay/webhook",
  "/api/cron/cleanup",
];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/api/auth")) return true;
  if (PUBLIC_API_ALLOWLIST.includes(pathname)) return true;
  if (
    pathname === "/login" ||
    pathname === "/privacy" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images")
  ) {
    return true;
  }
  return false;
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Handle unauthenticated API requests with 401
    if (pathname.startsWith("/api/") && !token && !isPublicPath(pathname)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!token) {
      return NextResponse.next();
    }

    // 1. Enforce firstLogin requirement
    if (token.firstLogin) {
      const allowedFirstLoginPaths = [
        "/first-login",
        "/api/auth/change-password",
        "/api/auth/signout",
        "/api/auth/session",
      ];

      const isAllowed = allowedFirstLoginPaths.some(
        (p) => pathname === p || pathname.startsWith("/api/auth/signout")
      );

      if (!isAllowed) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: "Password change required before accessing resources", code: "FIRST_LOGIN_REQUIRED" },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL("/first-login", req.url));
      }
    } else {
      // If user has already changed password, keep them away from /first-login
      if (pathname === "/first-login") {
        const dest = token.role === "ADMIN" || token.role === "SUPER_ADMIN" ? "/admin" : "/student";
        return NextResponse.redirect(new URL(dest, req.url));
      }
    }

    // 2. Enforce role-based prefix: /admin requires ADMIN or SUPER_ADMIN
    if (pathname.startsWith("/admin")) {
      const role = token.role;
      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/student", req.url));
      }
    }

    // 3. Prevent admins from accidentally hitting /student view (direct them to /admin)
    if (pathname.startsWith("/student") && (token.role === "ADMIN" || token.role === "SUPER_ADMIN")) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    const res = NextResponse.next();
    if (pathname.startsWith("/api/")) {
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    }
    return res;
  },
  {
    secret: process.env.NEXTAUTH_SECRET,
    cookies: {
      sessionToken: {
        name:
          process.env.NODE_ENV === "production"
            ? "__Secure-next-auth.session-token"
            : "next-auth.session-token",
      },
    },
    callbacks: {
      authorized({ req, token }) {
        const pathname = req.nextUrl.pathname;

        // Allow all public paths through without a token
        if (isPublicPath(pathname)) {
          return true;
        }

        // For API routes, let the middleware function handle it to return 401 JSON
        if (pathname.startsWith("/api/")) {
          return true;
        }

        // For protected pages (/student, /admin, /first-login, etc.), require token
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/student/:path*",
    "/admin/:path*",
    "/dashboard/:path*",
    "/first-login",
    "/api/:path*",
  ],
};
