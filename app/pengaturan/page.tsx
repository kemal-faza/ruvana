import type { Metadata } from "next";

import { requirePengguna } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Pengaturan akun | ruvana",
};

export default async function PengaturanAkunPage() {
  const pengguna = await requirePengguna();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <header className="max-w-2xl space-y-2">
        <p className="text-sm font-medium tracking-wide text-primary">Sistem</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">Informasi akun dan preferensi tampilan.</p>
      </header>

      <section aria-labelledby="account-title" className="max-w-2xl border-t border-border pt-6">
        <h2 id="account-title" className="font-heading text-lg font-semibold tracking-tight">
          Informasi akun
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Nama</dt>
            <dd className="mt-1 text-sm font-medium">{pengguna.nama}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Email</dt>
            <dd className="mt-1 text-sm font-medium">{pengguna.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Peran</dt>
            <dd className="mt-1 text-sm font-medium">Pengguna</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="appearance-title" className="max-w-2xl border-t border-border pt-6">
        <h2 id="appearance-title" className="font-heading text-lg font-semibold tracking-tight">
          Tampilan
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Gunakan tombol tema di bagian bawah sidebar untuk mengganti tampilan terang atau gelap.
        </p>
      </section>
    </main>
  );
}
