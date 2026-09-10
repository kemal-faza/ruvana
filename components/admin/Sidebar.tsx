"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Users, ChevronRight } from "lucide-react";
import { logout } from "@/app/login/actions";
import Logo from "@/components/Logo";
import type { SessionUser } from "@/lib/auth";

const NAV = [
  { id: "admin-users", label: "Kelola Akun", href: "/admin/pengguna", icon: Users },
];

export default function Sidebar({ admin }: { admin: SessionUser }) {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 232,
        minWidth: 232,
        height: "100%",
        background: "#1A1E14",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #252C1A",
      }}
    >
      <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid #252C1A" }}>
        <Logo tone="light" withText textColor="#E8E4DC" sublabel="Admin" size={38} />
      </div>

      <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
        {NAV.map(({ id, label, href, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={id}
              href={href}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 10,
                marginBottom: 2,
                background: isActive ? "#D9A441" : "transparent",
                color: isActive ? "#1A1A0E" : "#8A9470",
                textDecoration: "none",
                fontWeight: isActive ? 600 : 400,
                fontSize: 13.5,
              }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{label}</span>
              {isActive && <ChevronRight size={12} />}
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          padding: "14px 16px 18px",
          borderTop: "1px solid #252C1A",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "#6F7F3B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {admin.nama.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#C8D0B0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{admin.nama}</div>
            <div style={{ fontSize: 11, color: "#5C6450" }}>Admin</div>
          </div>
        </div>
        <button
          onClick={() => logout()}
          style={{
            marginTop: 4,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "1px solid #252C1A",
            borderRadius: 10,
            padding: "8px 12px",
            color: "#8A9470",
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: "Poppins, sans-serif",
            cursor: "pointer",
          }}
        >
          <LogOut size={14} /> Keluar
        </button>
      </div>
    </aside>
  );
}