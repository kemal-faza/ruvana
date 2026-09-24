import type { Metadata } from "next";

import AdminSidebar from "@/components/admin/Sidebar";
import { MobileAppBar } from "@/components/app-shell/mobile-app-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin — Ruvana",
  description: "Panel admin sistem reservasi dan pelaporan fasilitas kampus.",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <SidebarProvider>
      <AdminSidebar admin={admin} />
      <SidebarInset>
        <MobileAppBar />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
