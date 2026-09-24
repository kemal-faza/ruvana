import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell/app-shell";
import { ReservationDetail } from "@/components/reservation/reservation-detail";
import { Button } from "@/components/ui/button";
import { reservasiNavigation } from "../../navigation";

export const dynamic = "force-dynamic";

interface RiwayatDetailPageProps {
  params: Promise<{ id: string }>;
}

function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return id >= 1 ? id : null;
}

export default async function RiwayatDetailPage({ params }: RiwayatDetailPageProps) {
  const { id } = await params;
  const reservationId = parseId(id);
  if (reservationId === null) notFound();

  return (
    <AppShell navigation={reservasiNavigation} account={{ displayName: "Ayu Pratama", roleLabel: "Pengguna" }} logoutDestination="/keluar">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
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
