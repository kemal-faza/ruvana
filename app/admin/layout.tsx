import type { Metadata } from "next";
import Sidebar from "@/components/admin/Sidebar";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Ruvana — Admin",
  description: "Panel admin sistem reservasi & pelaporan fasilitas kampus.",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <Sidebar admin={admin} />
      {children}
    </div>
  );
}