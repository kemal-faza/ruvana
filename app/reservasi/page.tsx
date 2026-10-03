import { Suspense } from "react";
import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { requirePengguna } from "@/lib/auth";
import { getReservationReturnPath } from "@/lib/auth-routing";
import { shellAccountFromUser } from "@/config/navigation";
import { ReservationContent } from "./reservation-content";
import { ReservationContentSkeleton } from "./reservation-content-skeleton";
import { reservasiNavigation } from "./navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ajukan reservasi | ruvana",
  description: "Pilih fasilitas, tanggal, dan slot waktu untuk mengajukan reservasi.",
};

export default async function ReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;

  // Guard tetap dijalankan sebelum konten mulai memuat data fasilitas.
  const pengguna = await requirePengguna(getReservationReturnPath(query));
  const account = shellAccountFromUser(pengguna);

  return (
    <AppShell navigation={reservasiNavigation} account={account}>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium tracking-wide text-primary">Reservasi</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Ajukan reservasi</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Lengkapi detail reservasi untuk mengajukan peminjaman fasilitas.
          </p>
        </header>
        <Suspense fallback={<ReservationContentSkeleton />}>
          <ReservationContent searchParams={Promise.resolve(query)} />
        </Suspense>
      </main>
    </AppShell>
  );
}
