import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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

  console.log("Seed Modul 2 selesai: fasilitas UNDER_MAINTENANCE dan INACTIVE untuk data uji.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
