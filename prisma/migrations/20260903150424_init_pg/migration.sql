-- CreateEnum
CREATE TYPE "Role" AS ENUM ('pengguna', 'petugas', 'admin');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'DISABLED');

-- CreateEnum
CREATE TYPE "TipeFasilitas" AS ENUM ('ruang_kelas', 'aula', 'laboratorium', 'alat', 'lapangan');

-- CreateEnum
CREATE TYPE "StatusFasilitas" AS ENUM ('ACTIVE', 'UNDER_MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StatusReservasi" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED_BY_USER', 'CANCELLED_BY_OFFICER', 'EXPIRED');

-- CreateEnum
CREATE TYPE "StatusLaporan" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'pengguna',
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "dibuatOleh" INTEGER,
    "waktuDaftar" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waktuVerifikasi" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" "TipeFasilitas" NOT NULL,
    "lokasi" TEXT NOT NULL,
    "kapasitas" INTEGER NOT NULL,
    "deskripsi" TEXT,
    "status" "StatusFasilitas" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "tujuanPenggunaan" TEXT NOT NULL,
    "status" "StatusReservasi" NOT NULL DEFAULT 'PENDING',
    "alasan" TEXT,
    "diprosesOleh" INTEGER,
    "waktuDiproses" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "facilityId" INTEGER NOT NULL,
    "kategori" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "foto" TEXT,
    "status" "StatusLaporan" NOT NULL DEFAULT 'NEW',
    "catatanResolusi" TEXT,
    "ditanganiOleh" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_nama_key" ON "facilities"("nama");

-- CreateIndex
CREATE INDEX "reservations_facilityId_tanggal_startTime_status_idx" ON "reservations"("facilityId", "tanggal", "startTime", "status");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
