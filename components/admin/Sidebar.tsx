"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Users } from "lucide-react";

import { logout } from "@/app/login/actions";
import Logo from "@/components/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { SessionUser } from "@/lib/auth";

const NAVIGASI = [
  {
    key: "kelola",
    label: "Kelola",
    items: [{ key: "admin-users", label: "Kelola Akun", href: "/admin/pengguna", icon: Users }],
  },
] as const;

function inisial(nama: string) {
  return nama
    .split(" ")
    .map((kata) => kata[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminSidebar({ admin }: { admin: SessionUser }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="none">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link
          href="/admin/pengguna"
          onClick={() => setOpenMobile(false)}
          className="flex min-h-11 items-center rounded-md px-2"
          aria-label="Ruvana Admin — Kelola Akun"
        >
          <Logo tone="light" withText textColor="currentColor" sublabel="Admin" size={38} />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label="Navigasi utama">
          {NAVIGASI.map((grup) => (
            <SidebarGroup key={grup.key}>
              <SidebarGroupLabel>{grup.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {grup.items.map((item) => {
                    const aktif =
                      pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Ikon = item.icon;
                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          isActive={aktif}
                          className="min-h-11 px-3 py-2"
                          render={
                            <Link
                              href={item.href}
                              aria-current={aktif ? "page" : undefined}
                              onClick={() => setOpenMobile(false)}
                            />
                          }
                        >
                          <Ikon aria-hidden="true" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            >
              {inisial(admin.nama)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{admin.nama}</span>
              <span className="block truncate text-xs text-muted-foreground">Admin</span>
            </span>
          </div>
          <ThemeToggle />
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={() => logout()}
        >
          <LogOut aria-hidden="true" />
          <span>Keluar</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
