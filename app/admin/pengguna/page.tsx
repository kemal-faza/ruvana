import type { Metadata } from "next";

import AdminUsers from "@/components/admin/AdminUsers";
import { daftarPengguna } from "@/lib/admin/users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kelola pengguna | ruvana",
};

export default async function AdminPenggunaPage() {
  const { users, adminId } = await daftarPengguna();
  return <AdminUsers users={users} adminId={adminId} />;
}
