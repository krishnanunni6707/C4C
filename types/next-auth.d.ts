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
      role: "STUDENT" | "ADMIN";
      firstLogin: boolean;
    };
  }

  interface User {
    admissionNumber: string;
    department: string;
    semester: number;
    role: "STUDENT" | "ADMIN";
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
    firstLogin: boolean;
  }
}
