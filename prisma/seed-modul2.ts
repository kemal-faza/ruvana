import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TANDA_SEED = "[SEED-MODUL2]";

function tambahHari(base: Date, jumlahHari: number): Date {
  const hasil = new Date(base);
  hasil.setUTCDate(hasil.getUTCDate() + jumlahHari);
  return hasil;
}

function tanggalKalender(base: Date): Date {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
}

// jamWib >= 14 supaya instant UTC hasilnya (jamWib - 7) tetap >= '07:00' dan lolos
// CHECK chk_jam_operasional, yang memvalidasi jam UTC kolom TIMESTAMP(3) tanpa zona
// waktu (lihat docs/MODUL2-ROADMAP.md, bagian "Flag ke PM" nomor 2).
function jamWib(base: Date, jam: number, menit = 0): Date {
  const hasil = new Date(base);
  hasil.setUTCHours(jam - 7, menit, 0, 0);
  return hasil;
}

async function main() {
  const fasilitas = [
    {
      nama: "Lab Komputer 2",
      tipe: "laboratorium",
      lokasi: "Gedung B Lt.2",
      kapasitas: 35,
      deskripsi: "Lab komputer sedang dalam perbaikan jaringan",
      status: "UNDER_MAINTENANCE",
    },
    {
      nama: "Gudang Lama",
      tipe: "alat",
      lokasi: "Gedung C Lt.1",
      kapasitas: 1,
      deskripsi: "Sudah tidak digunakan",
      status: "INACTIVE",
    },
  ] as const;

  for (const f of fasilitas) {
    await prisma.facility.upsert({
      where: { nama: f.nama },
      update: {},
      create: {
        ...f,
        tipe: f.tipe as "ruang_kelas" | "aula" | "laboratorium" | "alat" | "lapangan",
        status: f.status as "ACTIVE" | "UNDER_MAINTENANCE" | "INACTIVE",
      },
    });
  }

  // Reservasi uji untuk FAC-02 (grid ketersediaan). Idempoten: hapus dulu reservasi
  // bertanda [SEED-MODUL2], baru buat ulang, supaya seed aman dijalankan berkali-kali.
  await prisma.reservation.deleteMany({ where: { tujuanPenggunaan: { startsWith: TANDA_SEED } } });

  const [rk101, pengguna] = await Promise.all([
    prisma.facility.findUniqueOrThrow({ where: { nama: "RK-101" } }),
    prisma.user.findUniqueOrThrow({ where: { email: "pengguna@ruvana.test" } }),
  ]);

  const besok = tambahHari(new Date(), 1);
  const lusa = tambahHari(new Date(), 2);

  await prisma.reservation.createMany({
    data: [
      {
        facilityId: rk101.id,
        userId: pengguna.id,
        tanggal: tanggalKalender(besok),
        startTime: jamWib(besok, 14, 0),
        endTime: jamWib(besok, 15, 0),
        tujuanPenggunaan: `${TANDA_SEED} Rapat kelompok (APPROVED, memblokir slot)`,
        status: "APPROVED",
      },
      {
        facilityId: rk101.id,
        userId: pengguna.id,
        tanggal: tanggalKalender(besok),
        startTime: jamWib(besok, 15, 0),
        endTime: jamWib(besok, 15, 30),
        tujuanPenggunaan: `${TANDA_SEED} Diskusi tugas (PENDING, tidak memblokir)`,
        status: "PENDING",
      },
      {
        facilityId: rk101.id,
        userId: pengguna.id,
        tanggal: tanggalKalender(lusa),
        startTime: jamWib(lusa, 16, 0),
        endTime: jamWib(lusa, 16, 30),
        tujuanPenggunaan: `${TANDA_SEED} Presentasi (APPROVED, memblokir slot)`,
        status: "APPROVED",
      },
    ],
  });

  console.log(
    "Seed Modul 2 selesai: 1 UNDER_MAINTENANCE, 1 INACTIVE, dan 3 reservasi uji ketersediaan pada RK-101.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
