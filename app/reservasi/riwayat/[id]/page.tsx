import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ReservationDetail } from "@/components/reservation/reservation-detail";
import { ReservationSuccessBanner } from "@/components/reservation/reservation-success-banner";
import { Button } from "@/components/ui/button";

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
    <main id="konten" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {dariPengajuan && <ReservationSuccessBanner />}
      <Button
        variant="ghost"
        className="min-h-11 w-fit -ml-3"
        nativeButton={false}
        render={<Link href="/reservasi/riwayat" />}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Kembali ke Reservasi
      </Button>
      <ReservationDetail id={reservationId} />
    </main>
  );
}
