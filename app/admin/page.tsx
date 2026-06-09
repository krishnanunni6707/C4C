import { redirect } from "next/navigation";

// /admin → /admin/overview
export default function AdminRootPage() {
  redirect("/admin/overview");
}
