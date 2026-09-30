import type { Metadata } from "next";

import { StaffDashboard } from "@/components/staff/dashboard";
import { requirePetugas } from "@/lib/auth";
import { listStaffQueueService, type StaffReservationResult } from "@/lib/services/reservation-service";
import { getStaffReservationSummaryService, type StaffReservationSummary } from "@/lib/services/reservation-summary";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard Petugas | ruvana",
};

export default async function PetugasDashboardPage() {
  await requirePetugas();

  let reservations: StaffReservationResult[] = [];
  let totalReservations = 0;
  let initialError = false;
  try {
    const queue = await listStaffQueueService({ page: 1, perPage: 3 });
    reservations = queue.data.items;
    totalReservations = queue.data.meta.totalItems;
  } catch (error) {
    console.error("Gagal memuat dashboard Petugas", error);
    initialError = true;
  }

  let ringkasan: StaffReservationSummary | null = null;
  let ringkasanGagal = false;
  try {
    ringkasan = await getStaffReservationSummaryService();
  } catch (error) {
    console.error("Gagal memuat ringkasan reservasi Petugas", error);
    ringkasanGagal = true;
  }

  return (
    <StaffDashboard
      reservations={reservations}
      totalReservations={totalReservations}
      initialError={initialError}
      ringkasan={ringkasan}
      ringkasanGagal={ringkasanGagal}
    />
  );
}
