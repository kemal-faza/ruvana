import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash("password123", 10);

  // Akun demo per role (upsert per email — idempoten)
  const akun = [
    { email: "admin@ruvana.test", nama: "Admin Ruvana", role: "admin", status: "ACTIVE" },
    { email: "petugas@ruvana.test", nama: "Petugas Ruvana", role: "petugas", status: "ACTIVE" },
    { email: "pengguna@ruvana.test", nama: "Pengguna Ruvana", role: "pengguna", status: "ACTIVE" },
    { email: "pending@ruvana.test", nama: "User Pending", role: "pengguna", status: "PENDING" },
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
        status: a.status as "PENDING" | "ACTIVE",
      },
    });
  }

  // Fasilitas contoh lintas tipe (upsert per nama — idempoten)
  const fasilitas = [
    { nama: "RK-101", tipe: "ruang_kelas", lokasi: "Gedung A Lt.1", kapasitas: 40, deskripsi: "Ruang kelas standar ber-AC" },
    { nama: "RK-102", tipe: "ruang_kelas", lokasi: "Gedung A Lt.1", kapasitas: 40, deskripsi: "Ruang kelas standar" },
    { nama: "Aula Utama", tipe: "aula", lokasi: "Gedung Serbaguna", kapasitas: 300, deskripsi: "Aula serbaguna dengan panggung" },
    { nama: "Lab Komputer 1", tipe: "laboratorium", lokasi: "Gedung B Lt.2", kapasitas: 35, deskripsi: "Lab komputer 35 unit" },
    { nama: "Lab Kimia", tipe: "laboratorium", lokasi: "Gedung B Lt.2", kapasitas: 30, deskripsi: "Laboratorium kimia dengan peralatan praktikum" },
    { nama: "Proyektor", tipe: "alat", lokasi: "Ruang Penyimpanan Alat", kapasitas: 1, deskripsi: "Proyektor portabel" },
    { nama: "Speaker", tipe: "alat", lokasi: "Ruang Penyimpanan Alat", kapasitas: 1, deskripsi: "Speaker portabel untuk acara" },
    { nama: "Lapangan Basket", tipe: "lapangan", lokasi: "Area Olahraga", kapasitas: 20, deskripsi: "Lapangan basket outdoor" },
    { nama: "Lapangan Futsal", tipe: "lapangan", lokasi: "Area Olahraga", kapasitas: 14, deskripsi: "Lapangan futsal rumput sintetis" },
  ] as const;

  for (const f of fasilitas) {
    await prisma.facility.upsert({
      where: { nama: f.nama },
      update: {},
      create: { ...f, tipe: f.tipe as "ruang_kelas" | "aula" | "laboratorium" | "alat" | "lapangan", status: "ACTIVE" },
    });
  }

  // Laporan contoh Modul 4 (hanya saat tabel masih kosong — idempoten).
  // Dua belas laporan: 3 per status, mencakup semua kategori PRD dan fasilitas
  // beragam, agar halaman /reports terlihat lengkap untuk demo & UAT.
  if ((await prisma.report.count()) === 0) {
    const pengguna = await prisma.user.findFirstOrThrow({ where: { email: "pengguna@ruvana.test" } });
    const petugas = await prisma.user.findFirstOrThrow({ where: { email: "petugas@ruvana.test" } });

    const findFacilityId = (nama: string) =>
      prisma.facility.findUniqueOrThrow({ where: { nama }, select: { id: true } }).then((f) => f.id);
    const [rk101, rk102, aulaId, labKomputer, labKimia, proyektor, speaker, lapanganBasket, lapanganFutsal] =
      await Promise.all([
        findFacilityId("RK-101"),
        findFacilityId("RK-102"),
        findFacilityId("Aula Utama"),
        findFacilityId("Lab Komputer 1"),
        findFacilityId("Lab Kimia"),
        findFacilityId("Proyektor"),
        findFacilityId("Speaker"),
        findFacilityId("Lapangan Basket"),
        findFacilityId("Lapangan Futsal"),
      ]);

    type DemoLaporan = {
      facilityId: number;
      kategori: string;
      status: "NEW" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
      deskripsi: string;
      hari: number;
      catatanResolusi: string | null;
      ditanganiOleh: number | null;
    };

    const demo: DemoLaporan[] = [
      {
        facilityId: rk101,
        kategori: "Listrik",
        status: "NEW",
        deskripsi: "Saklar lampu di dekat pintu baris ketiga tidak berfungsi sehingga ruangan terlihat redup saat sesi malam.",
        hari: 1,
        catatanResolusi: null,
        ditanganiOleh: null,
      },
      {
        facilityId: proyektor,
        kategori: "Peralatan",
        status: "NEW",
        deskripsi: "Bohlam proyektor mulai redup dan gambar tampak kekuningan saat dipakai menayangkan materi.",
        hari: 2,
        catatanResolusi: null,
        ditanganiOleh: null,
      },
      {
        facilityId: lapanganFutsal,
        kategori: "Lainnya",
        status: "NEW",
        deskripsi: "Dua lampu penerangan di menara selatan mati sehingga separuh lapangan gelap saat latihan malam.",
        hari: 3,
        catatanResolusi: null,
        ditanganiOleh: null,
      },
      {
        facilityId: labKomputer,
        kategori: "Peralatan",
        status: "IN_PROGRESS",
        deskripsi: "Monitor nomor 7 berkedip terus-menerus dan terkadang mati total saat digunakan untuk praktikum.",
        hari: 4,
        catatanResolusi: null,
        ditanganiOleh: petugas.id,
      },
      {
        facilityId: speaker,
        kategori: "Peralatan",
        status: "IN_PROGRESS",
        deskripsi: "Unit speaker kiri mengeluarkan bunyi statik yang mengganggu saat dipakai talk show.",
        hari: 5,
        catatanResolusi: null,
        ditanganiOleh: petugas.id,
      },
      {
        facilityId: rk102,
        kategori: "Furnitur",
        status: "IN_PROGRESS",
        deskripsi: "Meja dosen di depan goyang; salah satu kaki aus sehingga papan meja tidak stabil saat menulis.",
        hari: 6,
        catatanResolusi: null,
        ditanganiOleh: petugas.id,
      },
      {
        facilityId: aulaId,
        kategori: "Furnitur",
        status: "RESOLVED",
        deskripsi: "Dua kursi di baris depan panggung longgar dan berisik ketika diduduki.",
        hari: 9,
        catatanResolusi: "Kedua kursi telah dikencangkan dan satu unit rusak diganti dengan unit cadangan.",
        ditanganiOleh: petugas.id,
      },
      {
        facilityId: labKimia,
        kategori: "Peralatan",
        status: "RESOLVED",
        deskripsi: "Katup gas meja praktikum nomor 4 macet sehingga tidak bisa dibuka penuh.",
        hari: 11,
        catatanResolusi: "Katup dibersihkan dan dilumasi; seluruh titik gas diperiksa kembali.",
        ditanganiOleh: petugas.id,
      },
      {
        facilityId: lapanganBasket,
        kategori: "Bangunan",
        status: "RESOLVED",
        deskripsi: "Tekstur lantai di area tembakan luar mengelupas dan berisiko membuat pemain terpeleset.",
        hari: 13,
        catatanResolusi: "Lapisan pelindung lantai diperbaiki dan area diblokir selama proses pengeringan.",
        ditanganiOleh: petugas.id,
      },
      {
        facilityId: rk101,
        kategori: "Kebersihan",
        status: "REJECTED",
        deskripsi: "Bau tidak sedap dari sudut ruang dekat pantry saat kelas berlangsung.",
        hari: 15,
        catatanResolusi: "Pengecekan tidak menemukan sumber bau; area sudah masuk jadwal kebersihan harian.",
        ditanganiOleh: petugas.id,
      },
      {
        facilityId: labKomputer,
        kategori: "Lainnya",
        status: "REJECTED",
        deskripsi: "Satu unit mouse diduga hilang dari lab pada pekan lalu.",
        hari: 16,
        catatanResolusi: "Tidak ditemukan bukti kehilangan; ditindaklanjuti lewat prosedur barang hilang.",
        ditanganiOleh: petugas.id,
      },
      {
        facilityId: aulaId,
        kategori: "Listrik",
        status: "REJECTED",
        deskripsi: "Salah satu lampu arena kedap-kedip saat acara wisuda.",
        hari: 18,
        catatanResolusi: "Kedip berasal dari peredup sementara; seluruh lampu kini beroperasi normal.",
        ditanganiOleh: petugas.id,
      },
    ];

    const hari = 24 * 60 * 60 * 1000;
    await prisma.report.createMany({
      data: demo.map((r) => ({
        userId: pengguna.id,
        facilityId: r.facilityId,
        kategori: r.kategori,
        status: r.status,
        deskripsi: r.deskripsi,
        foto: null,
        catatanResolusi: r.catatanResolusi,
        ditanganiOleh: r.ditanganiOleh,
        createdAt: new Date(Date.now() - r.hari * hari),
        updatedAt: new Date(Date.now() - Math.max(0, r.hari - 1) * hari),
      })),
    });
  }

  console.log("Seed selesai: akun demo + fasilitas contoh + laporan contoh.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
