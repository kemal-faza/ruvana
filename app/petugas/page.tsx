import { AppShell } from "@/components/app-shell/app-shell";
import { StaffDashboard } from "@/components/staff/dashboard";
import { staffNavigation } from "@/components/staff/navigation";
import { requirePetugas } from "@/lib/auth";
import { listStaffQueueService, type StaffReservationResult } from "@/lib/services/reservation-service";

export const dynamic = "force-dynamic";

export default async function PetugasDashboardPage() {
  const petugas = await requirePetugas();

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

  return (
    <AppShell navigation={staffNavigation} account={{ displayName: petugas.nama, roleLabel: "Petugas" }}>
      <StaffDashboard
        reservations={reservations}
        totalReservations={totalReservations}
        initialError={initialError}
      />
    </AppShell>
  );
}
