import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      admissionNumber: string;
      department: string;
      semester: number;
      role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
      /** Only present for ADMIN role — the location they manage. */
      locationId: string | null;
      firstLogin: boolean;
    };
  }

  interface User {
    admissionNumber: string;
    department: string;
    semester: number;
    role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
    locationId: string | null;
    firstLogin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    admissionNumber: string;
    department: string;
    semester: number;
    role: string;
    locationId: string | null;
    firstLogin: boolean;
  }
}
