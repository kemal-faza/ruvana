import AdminUsers from "@/components/admin/AdminUsers";
import { daftarPengguna } from "@/lib/admin/users";

export const dynamic = "force-dynamic";

export default async function AdminPenggunaPage() {
  const { users, ringkasan } = await daftarPengguna();
  return <AdminUsers users={users} ringkasan={ringkasan} />;
}