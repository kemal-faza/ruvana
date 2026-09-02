import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash("password123", 10);

  // Akun demo per role (upsert per email — idempoten)
  const akun = [
    { email: "admin@ruvana.test", nama: "Admin Ruvana", role: "admin", status: "aktif" },
    { email: "petugas@ruvana.test", nama: "Petugas Ruvana", role: "petugas", status: "aktif" },
    { email: "pengguna@ruvana.test", nama: "Pengguna Ruvana", role: "pengguna", status: "aktif" },
    { email: "pending@ruvana.test", nama: "User Pending", role: "pengguna", status: "pending" },
  ] as const;

  for (const a of akun) {
    await prisma.user.upsert({
      where: { email: a.email },
      update: {},
      create: {
        email: a.email,
        nama: a.nama,
        password: hash,
        role: a.role as "pengguna" | "petugas" | "admin",
        status: a.status as "pending" | "aktif",
      },
    });
  }

  // Fasilitas contoh lintas tipe (upsert per nama — idempoten)
  const fasilitas = [
    { nama: "RK-101", tipe: "ruang_kelas", lokasi: "Gedung A Lt.1", kapasitas: 40, deskripsi: "Ruang kelas standar ber-AC" },
    { nama: "RK-102", tipe: "ruang_kelas", lokasi: "Gedung A Lt.1", kapasitas: 40, deskripsi: "Ruang kelas standar" },
    { nama: "Aula Utama", tipe: "aula", lokasi: "Gedung Serbaguna", kapasitas: 300, deskripsi: "Aula serbaguna dengan panggung" },
    { nama: "Lab Komputer 1", tipe: "laboratorium", lokasi: "Gedung B Lt.2", kapasitas: 35, deskripsi: "Lab komputer 35 unit" },
    { nama: "Proyektor LCD", tipe: "alat", lokasi: "Ruang Penyimpanan Alat", kapasitas: 1, deskripsi: "Proyektor LCD portabel" },
    { nama: "Kamera DSLR", tipe: "alat", lokasi: "Ruang Penyimpanan Alat", kapasitas: 1, deskripsi: "Kamera DSLR untuk dokumentasi" },
    { nama: "Lapangan Basket", tipe: "lapangan", lokasi: "Area Olahraga", kapasitas: 20, deskripsi: "Lapangan basket outdoor" },
    { nama: "Lapangan Futsal", tipe: "lapangan", lokasi: "Area Olahraga", kapasitas: 14, deskripsi: "Lapangan futsal rumput sintetis" },
  ] as const;

  for (const f of fasilitas) {
    await prisma.facility.upsert({
      where: { nama: f.nama },
      update: {},
      create: { ...f, tipe: f.tipe as "ruang_kelas" | "aula" | "laboratorium" | "alat" | "lapangan", status: "aktif" },
    });
  }

  console.log("Seed selesai: akun demo + fasilitas contoh.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
