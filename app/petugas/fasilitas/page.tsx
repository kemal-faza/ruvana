import type { Metadata } from "next";

import { FacilityStatusList } from "@/components/staff/facility-status-list";
import { requirePetugasAtauAdmin } from "@/lib/auth";
import { listStaffFacilitiesService } from "@/lib/services/facility-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status fasilitas | ruvana",
  description: "Tandai fasilitas dalam pemeliharaan atau kembalikan ke tersedia.",
};

interface PetugasFasilitasPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Param deep-link dari antrean laporan (?facilityId=). Nilai tak valid
// diabaikan diam-diam agar halaman tetap menampilkan seluruh daftar.
function parseFacilityId(raw: string | string[] | undefined): number | null {
  const teks = Array.isArray(raw) ? raw[0] : raw;
  if (!teks || !/^\d+$/.test(teks)) return null;
  const id = Number(teks);
  return id >= 1 ? id : null;
}

export default async function PetugasFasilitasPage({ searchParams }: PetugasFasilitasPageProps = {}) {
  // Layout menyiapkan shell; guard ini tetap memastikan hanya petugas/admin yang mengakses halaman.
  await requirePetugasAtauAdmin();

  const facilities = await listStaffFacilitiesService();
  const query = searchParams ? await searchParams : undefined;

  return (
    <main id="konten" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Status fasilitas</h1>
      </header>
      <FacilityStatusList facilities={facilities} sorotFacilityId={parseFacilityId(query?.facilityId)} />
    </main>
  );
}
