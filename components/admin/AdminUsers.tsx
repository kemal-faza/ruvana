"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Clock, Search, UserCheck, UserPlus, Users, UserX } from "lucide-react";

import { buatAkun, verifikasiPendaftaran } from "@/app/admin/pengguna/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AdminUserRow, RingkasanAkun } from "@/lib/admin/users";

const ROLE_LABEL: Record<AdminUserRow["role"], string> = {
  pengguna: "Pengguna",
  petugas: "Petugas",
  admin: "Admin",
};

const STATUS_CONFIG = {
  PENDING: { label: "Menunggu Verifikasi", variant: "pending" },
  ACTIVE: { label: "Aktif", variant: "success" },
  REJECTED: { label: "Ditolak", variant: "danger" },
  DISABLED: { label: "Dinonaktifkan", variant: "neutral" },
} as const;

const RINGKASAN_ITEM = [
  { key: "total", label: "Total akun", status: "", icon: Users },
  { key: "aktif", label: "Aktif", status: "ACTIVE", icon: UserCheck },
  { key: "pending", label: "Menunggu verifikasi", status: "PENDING", icon: Clock },
  { key: "dinonaktifkan", label: "Dinonaktifkan", status: "DISABLED", icon: UserX },
] as const;

const JUMLAH_PER_HALAMAN = 10;

type KunciUrut = "nama" | "waktuDaftar";
type ArahUrut = "naik" | "turun";

function TombolUrut({
  label,
  aktif,
  arah,
  onToggle,
}: {
  label: string;
  aktif: boolean;
  arah: ArahUrut;
  onToggle: () => void;
}) {
  const Ikon = aktif ? (arah === "naik" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Urutkan berdasarkan ${label}`}
      className="inline-flex min-h-11 items-center gap-1 rounded font-medium uppercase hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {label}
      <Ikon aria-hidden="true" className="size-3.5" />
    </button>
  );
}

function fmtTanggal(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function inisial(nama: string) {
  return nama
    .split(" ")
    .map((kata) => kata[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminUsers({
  users,
  ringkasan,
}: {
  users: AdminUserRow[];
  ringkasan: RingkasanAkun;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sheetTerbuka, setSheetTerbuka] = useState(false);
  const [kunciUrut, setKunciUrut] = useState<KunciUrut | null>(null);
  const [arahUrut, setArahUrut] = useState<ArahUrut>("naik");
  const [halaman, setHalaman] = useState(1);
  const [hasilVerifikasi, aksiVerifikasi, memverifikasi] = useActionState(
    verifikasiPendaftaran,
    { ok: false, pesan: "" },
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        (q === "" ||
          u.nama.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)) &&
        (!roleFilter || u.role === roleFilter) &&
        (!statusFilter || u.status === statusFilter),
    );
  }, [users, search, roleFilter, statusFilter]);

  function toggleUrut(kunci: KunciUrut) {
    if (kunciUrut === kunci) {
      setArahUrut((arah) => (arah === "naik" ? "turun" : "naik"));
    } else {
      setKunciUrut(kunci);
      setArahUrut("naik");
    }
    setHalaman(1);
  }

  const terurut = useMemo(() => {
    if (!kunciUrut) return filtered;
    const penyalin = [...filtered];
    penyalin.sort((a, b) => {
      const pembanding =
        kunciUrut === "nama"
          ? a.nama.localeCompare(b.nama, "id")
          : a.waktuDaftar.getTime() - b.waktuDaftar.getTime();
      return arahUrut === "naik" ? pembanding : -pembanding;
    });
    return penyalin;
  }, [filtered, kunciUrut, arahUrut]);

  const totalHalaman = Math.max(1, Math.ceil(terurut.length / JUMLAH_PER_HALAMAN));
  const halamanAktif = Math.min(halaman, totalHalaman);
  const barisHalaman = terurut.slice(
    (halamanAktif - 1) * JUMLAH_PER_HALAMAN,
    halamanAktif * JUMLAH_PER_HALAMAN,
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Administrasi</p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Kelola pengguna
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cari, tinjau, dan buat akun petugas atau pengguna.
          </p>
        </div>
        <Button type="button" onClick={() => setSheetTerbuka(true)}>
          <UserPlus aria-hidden="true" />
          <span>Tambah akun</span>
        </Button>
      </header>

      {hasilVerifikasi.pesan && (
        <p
          role={hasilVerifikasi.ok ? "status" : "alert"}
          className={hasilVerifikasi.ok ? "text-sm text-success" : "text-sm text-destructive"}
        >
          {hasilVerifikasi.pesan}
        </p>
      )}

      <section aria-label="Ringkasan akun" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {RINGKASAN_ITEM.map((item) => {
          const aktif = statusFilter === item.status;
          const Ikon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setStatusFilter(aktif ? "" : item.status);
                setHalaman(1);
              }}
              aria-pressed={aktif}
              title={aktif ? `Hapus filter ${item.label}` : `Tampilkan hanya ${item.label}`}
              className={`flex min-h-16 flex-col justify-center gap-1 rounded-card border bg-card p-4 text-left text-sm text-card-foreground shadow-subtle transition-all hover:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none ${aktif ? "border-ring ring-2 ring-ring/40" : "border-border"}`}
            >
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Ikon aria-hidden="true" className="size-4" />
                {item.label}
              </span>
              <span className="text-2xl font-bold tabular-nums">{ringkasan[item.key]}</span>
            </button>
          );
        })}
      </section>

      <section aria-label="Pencarian dan filter pengguna">
        <Card size="sm">
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="cari-pengguna"
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHalaman(1);
                }}
                placeholder="Cari nama atau email..."
                aria-label="Cari nama atau email"
                className="pl-9"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="sr-only">Filter peran</span>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setHalaman(1);
                }}
                aria-label="Filter peran"
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Semua peran</option>
                {Object.entries(ROLE_LABEL).map(([nilai, label]) => (
                  <option key={nilai} value={nilai}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="sr-only">Filter status</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setHalaman(1);
                }}
                aria-label="Filter status"
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Semua status</option>
                {Object.entries(STATUS_CONFIG).map(([nilai, config]) => (
                  <option key={nilai} value={nilai}>
                    {config.label}
                  </option>
                ))}
              </select>
            </label>
          </CardContent>
        </Card>
        <p aria-live="polite" className="mt-2 text-xs text-muted-foreground">
          Menampilkan {filtered.length} dari {users.length} akun.
        </p>
      </section>

      <section aria-label="Daftar pengguna">
        <Card className="gap-0 overflow-hidden p-0">
          {filtered.length > 0 ? (
            <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-160 text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                    <th
                      scope="col"
                      aria-sort={
                        kunciUrut === "nama"
                          ? arahUrut === "naik"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                      className="px-4 py-1 font-medium"
                    >
                      <TombolUrut
                        label="Pengguna"
                        aktif={kunciUrut === "nama"}
                        arah={arahUrut}
                        onToggle={() => toggleUrut("nama")}
                      />
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Peran
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th
                      scope="col"
                      aria-sort={
                        kunciUrut === "waktuDaftar"
                          ? arahUrut === "naik"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                      className="px-4 py-1 font-medium"
                    >
                      <TombolUrut
                        label="Terdaftar"
                        aktif={kunciUrut === "waktuDaftar"}
                        arah={arahUrut}
                        onToggle={() => toggleUrut("waktuDaftar")}
                      />
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Tindakan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {barisHalaman.map((u) => {
                    const status = STATUS_CONFIG[u.status as keyof typeof STATUS_CONFIG];
                    return (
                      <tr
                        key={u.id}
                        className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              aria-hidden="true"
                              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-subdued text-xs font-semibold text-primary-subdued-foreground"
                            >
                              {inisial(u.nama)}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{u.nama}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {u.email}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="neutral">{ROLE_LABEL[u.role] ?? u.role}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {status ? (
                            <Badge variant={status.variant}>{status.label}</Badge>
                          ) : (
                            <Badge variant="neutral">{u.status}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                          {fmtTanggal(u.waktuDaftar)}
                        </td>
                        <td className="px-4 py-3">
                          {u.status === "PENDING" && u.role === "pengguna" ? (
                            <form action={aksiVerifikasi} className="flex items-center gap-2">
                              <input type="hidden" name="id" value={u.id} />
                              <Button
                                type="submit"
                                name="keputusan"
                                value="setujui"
                                size="sm"
                                disabled={memverifikasi}
                              >
                                Setujui
                              </Button>
                              <Button
                                type="submit"
                                name="keputusan"
                                value="tolak"
                                size="sm"
                                variant="outline"
                                disabled={memverifikasi}
                              >
                                Tolak
                              </Button>
                            </form>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalHalaman > 1 && (
              <nav
                aria-label="Pagination"
                className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"
              >
                <p className="text-xs text-muted-foreground">
                  Halaman {halamanAktif} dari {totalHalaman}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={halamanAktif <= 1}
                    onClick={() => setHalaman(halamanAktif - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={halamanAktif >= totalHalaman}
                    onClick={() => setHalaman(halamanAktif + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              </nav>
            )}
            </>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Tidak ada pengguna yang cocok</EmptyTitle>
                <EmptyDescription>
                  Ubah kata kunci atau filter untuk melihat akun lain.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </Card>
      </section>

      <SheetBuatAkun terbuka={sheetTerbuka} onTerbukaChange={setSheetTerbuka} />
    </main>
  );
}

function SheetBuatAkun({
  terbuka,
  onTerbukaChange,
}: {
  terbuka: boolean;
  onTerbukaChange: (terbuka: boolean) => void;
}) {
  const [state, action, pending] = useActionState(buatAkun, { ok: false, pesan: "" });

  return (
    <Sheet open={terbuka} onOpenChange={onTerbukaChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Buat akun baru</SheetTitle>
          <SheetDescription>
            Akun petugas dan pengguna yang dibuat admin langsung berstatus aktif.
          </SheetDescription>
        </SheetHeader>
        <form action={action} className="flex flex-col gap-4 px-4 pb-4">
          <Field>
            <FieldLabel htmlFor="buat-nama" required>
              Nama lengkap
            </FieldLabel>
            <Input
              id="buat-nama"
              name="nama"
              placeholder="cth. Andi Wijaya"
              autoComplete="name"
              required
              minLength={3}
              aria-invalid={state.fieldErrors?.nama ? true : undefined}
              aria-describedby={state.fieldErrors?.nama ? "buat-nama-error" : undefined}
            />
            {state.fieldErrors?.nama && (
              <FieldError id="buat-nama-error">{state.fieldErrors.nama[0]}</FieldError>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="buat-email" required>
              Email
            </FieldLabel>
            <Input
              id="buat-email"
              name="email"
              type="email"
              placeholder="nama@email.com"
              autoComplete="email"
              required
              aria-invalid={state.fieldErrors?.email ? true : undefined}
              aria-describedby={state.fieldErrors?.email ? "buat-email-error" : undefined}
            />
            {state.fieldErrors?.email && (
              <FieldError id="buat-email-error">{state.fieldErrors.email[0]}</FieldError>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="buat-password" required>
              Password awal
            </FieldLabel>
            <Input
              id="buat-password"
              name="password"
              type="password"
              placeholder="Min. 8 karakter, huruf & angka"
              autoComplete="new-password"
              required
              minLength={8}
              aria-invalid={state.fieldErrors?.password ? true : undefined}
              aria-describedby={
                state.fieldErrors?.password ? "buat-password-error" : undefined
              }
            />
            {state.fieldErrors?.password && (
              <FieldError id="buat-password-error">
                {state.fieldErrors.password[0]}
              </FieldError>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="buat-role" required>
              Peran
            </FieldLabel>
            <select
              id="buat-role"
              name="role"
              required
              defaultValue=""
              aria-invalid={state.fieldErrors?.role ? true : undefined}
              aria-describedby={state.fieldErrors?.role ? "buat-role-error" : undefined}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="" disabled>
                Pilih peran
              </option>
              <option value="petugas">Petugas</option>
              <option value="pengguna">Pengguna</option>
            </select>
            {state.fieldErrors?.role && (
              <FieldError id="buat-role-error">{state.fieldErrors.role[0]}</FieldError>
            )}
          </Field>
          {state.pesan && (
            <p
              role={state.ok ? "status" : "alert"}
              className={
                state.ok
                  ? "rounded-lg bg-success-subdued px-3 py-2 text-xs font-medium text-success-subdued-foreground"
                  : "rounded-lg bg-destructive-subdued px-3 py-2 text-xs font-medium text-destructive-subdued-foreground"
              }
            >
              {state.pesan}
            </p>
          )}
          <Button type="submit" loading={pending}>
            Buat akun
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
