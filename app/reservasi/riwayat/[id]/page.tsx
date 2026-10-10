import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import { ReservationDetail } from "@/components/reservation/reservation-detail";
import { ReservationSuccessBanner } from "@/components/reservation/reservation-success-banner";
import { Button } from "@/components/ui/button";
import { reservasiNavigation } from "../../navigation";
import { shellAccountFromUser } from "@/config/navigation";
import { requirePengguna } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detail reservasi | ruvana",
  description: "Lihat detail reservasi milik Anda dan batalkan bila masih memenuhi batas waktu.",
};

interface RiwayatDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return id >= 1 ? id : null;
}

export default async function RiwayatDetailPage({ params, searchParams }: RiwayatDetailPageProps) {
  // Guard server dulu (IAM-03) sebelum id diproses.
  const pengguna = await requirePengguna();
  const account = shellAccountFromUser(pengguna);
  const { id } = await params;
  const reservationId = parseId(id);
  if (reservationId === null) notFound();
  // Banner konfirmasi hanya tampil untuk navigasi sukses barusan
  // (?baru=1 dari form pengajuan). Nilai lain diabaikan agar banner tidak
  // muncul saat halaman dibuka dari riwayat.
  const query = await searchParams;
  const penanda = Array.isArray(query.baru) ? query.baru[0] : query.baru;
  const dariPengajuan = penanda === "1";

  return (
    <AppShell navigation={reservasiNavigation} account={account}>
      <main id="konten" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        {dariPengajuan && <ReservationSuccessBanner />}
        <Button
          variant="ghost"
          className="min-h-11 w-fit -ml-3"
          nativeButton={false}
          render={<Link href="/reservasi/riwayat" />}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Kembali ke Reservasi Saya
        </Button>
        <ReservationDetail id={reservationId} />
      </main>
    </AppShell>
  );
}
