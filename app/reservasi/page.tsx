import { AppShell } from "@/components/app-shell/app-shell";
import { ReservationForm } from "@/components/reservation/reservation-form";
import { reservasiNavigation } from "./navigation";
import { computeFacilityAvailability } from "@/lib/reservations/availability";
import { listPublicFacilities } from "@/lib/services/facility-service";
import { isValidDateFormat } from "@/lib/time/reservation-time";

export const dynamic = "force-dynamic";

async function getFacilities() {
  // Sumber data asli Modul 2 (fasilitas): ambil daftar publik lalu saring yang ACTIVE untuk dropdown reservasi
  const { items } = await listPublicFacilities({ page: 1, perPage: 500 });
  return items
    .filter((facility) => facility.status === "ACTIVE")
    .map((facility) => ({ id: facility.id, nama: facility.nama, lokasi: facility.lokasi }))
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}

export default async function ReservasiPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const facilities = await getFacilities();
  const query = await searchParams;

  const rawFacilityId = Array.isArray(query.facilityId) ? query.facilityId[0] : query.facilityId;
  const rawDate = Array.isArray(query.date) ? query.date[0] : query.date;

  // Tanggal default: besok, agar tidak langsung lampau
  const fallbackDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();
  const date = rawDate && isValidDateFormat(rawDate) ? rawDate : fallbackDate;

  const parsedFacilityId = rawFacilityId ? Number(rawFacilityId) : NaN;
  const facilityId = facilities.some((f) => f.id === parsedFacilityId)
    ? parsedFacilityId
    : (facilities[0]?.id ?? 0);

  // Hitung availability di server (internal, bukan endpoint publik),
  // lalu teruskan sebagai prop — client tidak fetch API baru.
  const availability =
    facilityId > 0 ? await computeFacilityAvailability(facilityId, date) : null;

  return (
    <AppShell navigation={reservasiNavigation} account={{ displayName: "Ayu Pratama", roleLabel: "Pengguna" }} logoutDestination="/keluar">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium tracking-wide text-primary">Reservasi</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Ajukan reservasi</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">Lengkapi detail reservasi untuk mengajukan peminjaman fasilitas.</p>
        </header>
        <ReservationForm
          key={`${facilityId}:${date}`}
          facilities={facilities}
          facilityId={facilityId}
          date={date}
          availability={availability}
        />
      </main>
    </AppShell>
  );
}
