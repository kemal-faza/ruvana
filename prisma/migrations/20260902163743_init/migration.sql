-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('pengguna', 'petugas', 'admin') NOT NULL DEFAULT 'pengguna',
    `status` ENUM('pending', 'aktif', 'ditolak', 'dinonaktifkan') NOT NULL DEFAULT 'pending',
    `dibuatOleh` INTEGER NULL,
    `waktuDaftar` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `waktuVerifikasi` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `facilities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `tipe` ENUM('ruang_kelas', 'aula', 'laboratorium', 'alat', 'lapangan') NOT NULL,
    `lokasi` VARCHAR(191) NOT NULL,
    `kapasitas` INTEGER NOT NULL,
    `deskripsi` VARCHAR(191) NULL,
    `status` ENUM('aktif', 'dalam_perbaikan', 'nonaktif') NOT NULL DEFAULT 'aktif',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `facilities_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `tanggal` DATE NOT NULL,
    `startTime` TIME NOT NULL,
    `endTime` TIME NOT NULL,
    `tujuanPenggunaan` VARCHAR(191) NOT NULL,
    `status` ENUM('menunggu', 'disetujui', 'ditolak', 'dibatalkan_oleh_pengguna', 'dibatalkan_oleh_petugas', 'kedaluwarsa') NOT NULL DEFAULT 'menunggu',
    `alasan` VARCHAR(191) NULL,
    `diprosesOleh` INTEGER NULL,
    `waktuDiproses` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `reservations_facilityId_tanggal_startTime_status_idx`(`facilityId`, `tanggal`, `startTime`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `facilityId` INTEGER NOT NULL,
    `kategori` VARCHAR(191) NOT NULL,
    `deskripsi` VARCHAR(191) NOT NULL,
    `foto` VARCHAR(191) NULL,
    `status` ENUM('baru', 'diproses', 'selesai', 'ditolak') NOT NULL DEFAULT 'baru',
    `catatanResolusi` VARCHAR(191) NULL,
    `ditanganiOleh` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
