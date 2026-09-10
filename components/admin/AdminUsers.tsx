"use client";

import { useMemo, useState, useActionState } from "react";
import { Search, X, UserPlus } from "lucide-react";
import { buatAkun } from "@/app/admin/pengguna/actions";
import type { AdminUserRow, RingkasanAkun } from "@/lib/admin/users";

const C = { bg: "#F7F5EF", surface: "#FFFFFF", primary: "#6F7F3B", secondary: "#D9A441", accent: "#E89B45", text: "#252525", muted: "#77746D", border: "#E5E2D9", soft: "#F1F0EA" };

const ROLE_LABEL = { pengguna: "Pengguna", petugas: "Petugas", admin: "Admin" };
const STATUS_LABEL: Record<string, string> = { PENDING: "Pending", ACTIVE: "Aktif", REJECTED: "Ditolak", DISABLED: "Dinonaktifkan" };
const STATUS_COLOR: Record<string, string> = { PENDING: "#8A5A10", ACTIVE: "#4A5A28", REJECTED: "#B2531E", DISABLED: "#6A6460" };

function ringkasanChip({ label, value, bg }: { label: string; value: number; bg: string }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "16px 20px", minWidth: 160 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: C.text }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.muted, marginTop: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: 3, background: bg }} />
        {label}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span style={{ color: STATUS_COLOR[status] || C.muted, fontSize: 12, fontWeight: 600 }}>{STATUS_LABEL[status] || status}</span>;
}

function fmtTanggal(date: Date) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default function AdminUsers({ users, ringkasan }: { users: AdminUserRow[]; ringkasan: RingkasanAkun }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u =>
      (u.nama.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (!roleFilter || u.role === roleFilter) &&
      (!statusFilter || u.status === statusFilter)
    );
  }, [users, search, roleFilter, statusFilter]);

  return (
    <div style={{ flex: 1, background: C.bg, overflowY: "auto", height: "100%" }}>
      <div style={{ padding: "28px 32px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Manajemen Pengguna</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted }}>Buat akun petugas dan pengguna secara langsung.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: C.primary, color: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 600, fontFamily: "Poppins, sans-serif", cursor: "pointer", boxShadow: "0 2px 8px rgba(111,127,59,0.3)" }}>
          <UserPlus size={16} /> Tambah Petugas / Pengguna
        </button>
      </div>

      <div style={{ padding: "20px 32px 0", display: "flex", gap: 12, flexWrap: "wrap" }}>
        {ringkasanChip({ label: "Total Akun", value: ringkasan.total, bg: C.accent })}
        {ringkasanChip({ label: "Aktif", value: ringkasan.aktif, bg: C.primary })}
        {ringkasanChip({ label: "Pending", value: ringkasan.pending, bg: C.secondary })}
        {ringkasanChip({ label: "Dinonaktifkan", value: ringkasan.dinonaktifkan, bg: "#B2ACA4" })}
      </div>

      <div style={{ padding: "20px 32px 0", display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "9px 14px", flex: 1, minWidth: 220 }}>
          <Search size={15} color={C.muted} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atau email..." style={{ border: "none", outline: "none", fontSize: 13, fontFamily: "Poppins, sans-serif", background: "transparent", width: "100%", color: C.text }} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ padding: "9px 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, fontFamily: "Poppins, sans-serif", color: C.text, cursor: "pointer" }}>
          <option value="">Semua Role</option>
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: "9px 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, fontSize: 13, fontFamily: "Poppins, sans-serif", color: C.text, cursor: "pointer" }}>
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div style={{ padding: "20px 32px 40px" }}>
        <div style={{ background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <th style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>Pengguna</th>
                <th style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>Role</th>
                <th style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>Status</th>
                <th style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>Terdaftar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${C.soft}` }}>
                  <td style={{ padding: "12px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #EDF0E4, #DCE4C8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#4A5A28", flexShrink: 0 }}>
                        {u.nama.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: C.text }}>{u.nama}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 18px" }}>
                    <span style={{ background: C.soft, color: C.text, fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{ROLE_LABEL[u.role] || u.role}</span>
                  </td>
                  <td style={{ padding: "12px 18px" }}><StatusBadge status={u.status} /></td>
                  <td style={{ padding: "12px 18px", color: C.muted, fontSize: 12 }}>{fmtTanggal(u.waktuDaftar)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "30px", textAlign: "center", color: C.muted }}>Tidak ada pengguna yang cocok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <CreateAccountModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

function CreateAccountModal({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState(buatAkun, { ok: false, pesan: "" });
  const role = state.fieldErrors?.role;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(40,40,35,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={onClose}>
      <div style={{ background: C.surface, borderRadius: 20, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", padding: "24px 26px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>Buat Akun Baru</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><X size={18} /></button>
        </div>
        <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Nama Lengkap" error={state.fieldErrors?.nama}>
            <input name="nama" placeholder="cth. Andi Wijaya" style={inputStyle} />
          </Field>
          <Field label="Email" error={state.fieldErrors?.email}>
            <input name="email" type="email" placeholder="nama@email.com" style={inputStyle} />
          </Field>
          <Field label="Password Awal" error={state.fieldErrors?.password}>
            <input name="password" type="password" placeholder="Min. 8 karakter, huruf & angka" style={inputStyle} />
          </Field>
          <Field label="Role" error={role}>
            <select name="role" style={{ ...inputStyle, cursor: "pointer" }} defaultValue="">
              <option value="" disabled>Pilih role</option>
              <option value="petugas">Petugas</option>
              <option value="pengguna">Pengguna</option>
            </select>
          </Field>
          {state.pesan && (
            <div style={{ fontSize: 12.5, fontWeight: 600, color: state.ok ? C.primary : "#B2531E", background: state.ok ? "#EDF0E4" : "#FBEAE5", padding: "9px 12px", borderRadius: 10 }}>{state.pesan}</div>
          )}
          <button type="submit" disabled={pending} style={{ marginTop: 4, background: C.primary, color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 600, fontFamily: "Poppins, sans-serif", cursor: "pointer", opacity: pending ? 0.6 : 1 }}>
            {pending ? "Menyimpan..." : "Buat Akun"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 13px",
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontSize: 13,
  fontFamily: "Poppins, sans-serif",
  background: C.bg,
  color: C.text,
  outline: "none",
  boxSizing: "border-box",
};

function Field({ label, error, children }: { label: string; error?: string[]; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{label}</span>
      {children}
      {error && error.length > 0 && <span style={{ fontSize: 11.5, color: "#B2531E" }}>{error[0]}</span>}
    </label>
  );
}