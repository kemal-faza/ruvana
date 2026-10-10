import type { Metadata } from "next";

import { FacilityStatusList } from "@/components/staff/facility-status-list";
import { requirePetugasAtauAdmin } from "@/lib/auth";
import { listStaffFacilitiesService } from "@/lib/services/facility-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status fasilitas | ruvana",
  description: "Tandai fasilitas dalam pemeliharaan atau kembalikan ke tersedia.",
};

export default async function PetugasFasilitasPage() {
  // Layout menyiapkan shell; guard ini tetap memastikan hanya petugas/admin yang mengakses halaman.
  await requirePetugasAtauAdmin();

  const facilities = await listStaffFacilitiesService();

  return (
    <main id="konten" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-primary">Petugas</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Status fasilitas</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Tandai fasilitas dalam pemeliharaan saat tidak bisa dipakai, lalu kembalikan ke tersedia setelah perbaikan.
          Reservasi yang sudah disetujui dan dimulai setelah perubahan status akan dibatalkan otomatis.
        </p>
      </header>
      <FacilityStatusList facilities={facilities} />
    </main>
  );
}
