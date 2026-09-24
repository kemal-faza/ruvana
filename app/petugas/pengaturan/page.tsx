import { AppShell } from "@/components/app-shell/app-shell";
import { staffNavigation } from "@/components/staff/navigation";
import { requirePetugas } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PengaturanPetugasPage() {
  const petugas = await requirePetugas();

  return (
    <AppShell navigation={staffNavigation} account={{ displayName: petugas.nama, roleLabel: "Petugas" }}>
      <main className="mx-auto flex w-full max-w-shell min-w-0 flex-col gap-8 px-4 pt-8 pb-12 sm:px-7 sm:pt-12 sm:pb-16 lg:pt-section-top">
        <header className="max-w-heading">
          <p className="mb-4 flex items-center gap-3 text-caption font-semibold tracking-eyebrow text-brand-olive uppercase">
            Preferensi akun
            <span aria-hidden="true" className="h-px w-eyebrow-rule bg-brand-olive" />
          </p>
          <h1 className="mb-4 text-display-md font-semibold tracking-heading">Pengaturan petugas</h1>
          <p className="text-lede text-muted-foreground sm:text-lede-lg">
            Kelola preferensi tampilan dan informasi akun Anda.
          </p>
        </header>

        <section aria-labelledby="akun-petugas-title" className="max-w-heading border-t border-border pt-6">
          <h2 id="akun-petugas-title" className="font-heading text-lg font-semibold tracking-subtitle">
            Informasi akun
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Nama</dt>
              <dd className="mt-1 text-sm font-medium">{petugas.nama}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Peran</dt>
              <dd className="mt-1 text-sm font-medium">Petugas</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="tampilan-title" className="max-w-heading border-t border-border pt-6">
          <h2 id="tampilan-title" className="font-heading text-lg font-semibold tracking-subtitle">
            Tampilan
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gunakan tombol tema di bagian bawah sidebar untuk mengganti tampilan terang atau gelap.
          </p>
        </section>
      </main>
    </AppShell>
  );
}
