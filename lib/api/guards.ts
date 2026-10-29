/**
 * Centralized Route Guards for API Security (P-05)
 *
 * Enforces role-based and location-scoped access control across all API routes.
 * Never trust the client for roles, user IDs, or locations.
 */

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getPrintJobById } from "@/lib/firestore/print-jobs";
import type { FirestorePrintJob } from "@/lib/firebase/collections";
import type { Session } from "next-auth";

export type UserRole = "STUDENT" | "ADMIN" | "SUPER_ADMIN";

export type GuardSession = Session;

export type GuardResult<T = {}> =
  | ({ ok: true; session: GuardSession } & T)
  | { ok: false; response: NextResponse };

/**
 * Require the caller to be authenticated with one of the allowed roles.
 * Rejects unauthenticated callers with 401, disabled users with 403,
 * and callers with insufficient roles with 403.
 */
export async function requireRole(
  allowedRoles: UserRole | UserRole[]
): Promise<GuardResult> {
  const session = (await getServerSession(authOptions)) as GuardSession | null;

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized: Authentication required" },
        { status: 401 }
      ),
    };
  }

  if (session.user.disabled) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden: Account has been disabled" },
        { status: 403 }
      ),
    };
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!roles.includes(session.user.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden: Insufficient privileges" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, session };
}

/**
 * Require caller to be an ADMIN or SUPER_ADMIN.
 * If locationScoped is true and role is ADMIN, verifies that the admin has an assigned locationId.
 * SUPER_ADMIN is never location-scoped and has global access.
 */
export async function requireAdmin(
  locationScoped = true
): Promise<GuardResult<{ locationId?: string | null; isSuperAdmin: boolean }>> {
  const guard = await requireRole(["ADMIN", "SUPER_ADMIN"]);
  if (!guard.ok) return guard;

  const isSuperAdmin = guard.session.user.role === "SUPER_ADMIN";
  const locationId = guard.session.user.locationId;

  if (!isSuperAdmin && locationScoped && !locationId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden: Admin account has no assigned location" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    session: guard.session,
    locationId,
    isSuperAdmin,
  };
}

/**
 * Require access to a specific print job by ID.
 * - SUPER_ADMIN: full read/write access to any job.
 * - ADMIN: read/write access only to jobs matching their assigned locationId.
 * - STUDENT: read-only access strictly to jobs they own (job.studentId === session.user.id).
 */
export async function requireJobAccess(
  jobId: string,
  mode: "read" | "write" = "write"
): Promise<GuardResult<{ job: FirestorePrintJob }>> {
  const session = (await getServerSession(authOptions)) as GuardSession | null;

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized: Authentication required" },
        { status: 401 }
      ),
    };
  }

  if (session.user.disabled) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden: Account has been disabled" },
        { status: 403 }
      ),
    };
  }

  const job = await getPrintJobById(jobId);
  if (!job) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      ),
    };
  }

  const role = session.user.role;

  // SUPER_ADMIN has global access
  if (role === "SUPER_ADMIN") {
    return { ok: true, session, job };
  }

  // ADMIN is location-scoped
  if (role === "ADMIN") {
    if (!session.user.locationId || job.locationId !== session.user.locationId) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Forbidden: Job belongs to a different location" },
          { status: 403 }
        ),
      };
    }
    return { ok: true, session, job };
  }

  // STUDENT can only read their own jobs
  if (role === "STUDENT") {
    if (mode === "write") {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Forbidden: Students cannot perform administrative job actions" },
          { status: 403 }
        ),
      };
    }
    if (job.studentId !== session.user.id) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Forbidden: You do not own this job" },
          { status: 403 }
        ),
      };
    }
    return { ok: true, session, job };
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: "Forbidden: Access denied" },
      { status: 403 }
    ),
  };
}
