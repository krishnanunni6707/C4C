/**
 * GET /api/auth/verify-session
 * Returns the current session state. Useful for debugging auth.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        message: "No active session — please log in.",
      });
    }

    return NextResponse.json({
      authenticated: true,
      message: "✅ Session is valid.",
      user: {
        id: session.user.id,
        name: session.user.name,
        admissionNumber: session.user.admissionNumber,
        department: session.user.department,
        semester: session.user.semester,
        role: session.user.role,
        firstLogin: session.user.firstLogin,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to verify session", details: msg },
      { status: 500 }
    );
  }
}
