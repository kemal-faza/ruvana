// Rekap bulanan reservasi untuk dashboard petugas (RES-11).
// Controller: memakai singleton Prisma; View hanya menerima angka siap tampil.
// Terpisah tegas dari analitik admin (ANA-01): modul ini tidak memakai
// lib/db/analytics.ts maupun admin-analytics-service.
// Dasar pengelompokan: tanggal pemakaian (kolom tanggal, DATE kalender
// Asia/Jakarta), bukan waktu pengajuan.
import { STATUS_RESERVASI, ZONA_WAKTU } from "@/config/business";
import { LABEL_STATUS_RESERVASI } from "@/config/labels";
import { prisma } from "@/lib/prisma";
import {
  formatMonthLabelIndonesia,
  getMonthRange,
  listTrendMonths,
} from "@/lib/validation/staff-recap-month";
import type { StatusReservasi } from "@/generated/prisma/enums";

export interface StaffRecapStatusItem {
  status: StatusReservasi;
  label: string;
  count: number;
}

export interface StaffRecapFacilityItem {
  facilityId: number;
  facilityName: string;
  count: number;
}

export interface StaffRecapTrendItem {
  month: string;
  label: string;
  count: number;
}

export interface StaffMonthlyRecap {
  month: string;
  monthLabel: string;
  total: number;
  perStatus: StaffRecapStatusItem[];
  perFacility: StaffRecapFacilityItem[];
  trend: StaffRecapTrendItem[];
  methodology: {
    timezone: string;
    groupingRule: string;
    statusRule: string;
    trendRule: string;
    exportNote: string;
  };
}

function compareIndonesian(a: string, b: string): number {
  return a.localeCompare(b, "id", { sensitivity: "base" }) || a.localeCompare(b, "id");
}

// Batas setengah-terbuka [awal bulan, awal bulan berikutnya) sebagai UTC
// midnight agar cocok dengan kolom DATE tanpa bergantung TimeZone sesi database.
function monthBounds(month: string): { from: Date; until: Date } {
  const { startDate } = getMonthRange(month);
  const [tahun, bulan, hari] = startDate.split("-").map(Number);
  const from = new Date(Date.UTC(tahun, bulan - 1, hari));
  const until = new Date(Date.UTC(tahun, bulan, 1));
  return { from, until };
}

export async function getStaffMonthlyRecapService(month: string): Promise<StaffMonthlyRecap> {
  const { from, until } = monthBounds(month);
  const rentang = { tanggal: { gte: from, lt: until } };

  const [statusRows, facilityRows] = await Promise.all([
    prisma.reservation.groupBy({
      by: ["status"],
      where: rentang,
      _count: { _all: true },
    }),
    prisma.reservation.groupBy({
      by: ["facilityId"],
      where: rentang,
      _count: { _all: true },
    }),
  ]);

  const jumlahPerStatus = new Map<StatusReservasi, number>(
    statusRows.map((row) => [row.status, row._count._all]),
  );
  const perStatus: StaffRecapStatusItem[] = STATUS_RESERVASI.map((status) => ({
    status,
    label: LABEL_STATUS_RESERVASI[status],
    count: jumlahPerStatus.get(status) ?? 0,
  }));

  const idFasilitas = facilityRows.map((row) => row.facilityId);
  const daftarFasilitas =
    idFasilitas.length === 0
      ? []
      : await prisma.facility.findMany({
          where: { id: { in: idFasilitas } },
          select: { id: true, nama: true },
        });
  const namaPerId = new Map(daftarFasilitas.map((fasilitas) => [fasilitas.id, fasilitas.nama]));
  const perFacility: StaffRecapFacilityItem[] = facilityRows
    .map((row) => ({
      facilityId: row.facilityId,
      facilityName: namaPerId.get(row.facilityId) ?? `Fasilitas ${row.facilityId}`,
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count || compareIndonesian(a.facilityName, b.facilityName));

  const bulanTren = listTrendMonths(month);
  const jumlahTren = await Promise.all(
    bulanTren.map((bulan) => {
      const batas = monthBounds(bulan);
      return prisma.reservation.count({
        where: { tanggal: { gte: batas.from, lt: batas.until } },
      });
    }),
  );
  const trend: StaffRecapTrendItem[] = bulanTren.map((bulan, index) => ({
    month: bulan,
    label: formatMonthLabelIndonesia(bulan),
    count: jumlahTren[index] ?? 0,
  }));

  return {
    month,
    monthLabel: formatMonthLabelIndonesia(month),
    total: perStatus.reduce((jumlah, item) => jumlah + item.count, 0),
    perStatus,
    perFacility,
    trend,
    methodology: {
      timezone: ZONA_WAKTU,
      groupingRule: `Dikelompokkan berdasarkan tanggal pemakaian (kolom tanggal) dalam kalender ${ZONA_WAKTU}, bukan waktu pengajuan.`,
      statusRule: "Seluruh status reservasi dihitung.",
      trendRule: "Tren memuat 6 bulan terakhir termasuk bulan terpilih.",
      exportNote: "Ekspor rekap berada di luar scope.",
    },
  };
}
