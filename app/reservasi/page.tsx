import { Suspense } from "react";
import type { Metadata } from "next";

import { ReservationContent } from "./reservation-content";
import { ReservationContentSkeleton } from "./reservation-content-skeleton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ajukan reservasi | ruvana",
  description: "Pilih fasilitas, tanggal, dan slot waktu untuk mengajukan reservasi.",
};

export default function ReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-primary">Reservasi</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Ajukan reservasi</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Pilih fasilitas dan waktu, lalu tulis tujuan reservasi.
        </p>
      </header>
      <Suspense fallback={<ReservationContentSkeleton />}>
        <ReservationContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
