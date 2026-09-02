-- Ubah nilai enum status (AccountStatus, StatusFasilitas, StatusReservasi, StatusLaporan)
-- dari bahasa Indonesia ke Inggris (keputusan tim, Fase 0).
--
-- MySQL ENUM + collation case-insensitive (utf8mb4_unicode_ci): nilai 'aktif' dan 'ACTIVE'
-- dianggap duplikat dalam satu ENUM, jadi pola "perluas -> update -> persempit" GAGAL (error 1291).
-- Solusi yang benar: ubah kolom ke VARCHAR sementara -> UPDATE nilai -> ubah kembali ke ENUM baru.
-- Data yang tersisa (tidak cocok pola) dipetakan via CASE untuk keamanan.

-- Step 1: users.status (pending/aktif/ditolak/dinonaktifkan -> PENDING/ACTIVE/REJECTED/DISABLED)
ALTER TABLE `users` MODIFY `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING';
UPDATE `users`
  SET `status` = CASE `status`
    WHEN 'pending'        THEN 'PENDING'
    WHEN 'aktif'          THEN 'ACTIVE'
    WHEN 'ditolak'        THEN 'REJECTED'
    WHEN 'dinonaktifkan'  THEN 'DISABLED'
    ELSE 'PENDING'
  END;
ALTER TABLE `users` MODIFY `status` ENUM('PENDING','ACTIVE','REJECTED','DISABLED') NOT NULL DEFAULT 'PENDING';

-- Step 2: facilities.status (aktif/dalam_perbaikan/nonaktif -> ACTIVE/UNDER_MAINTENANCE/INACTIVE)
ALTER TABLE `facilities` MODIFY `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';
UPDATE `facilities`
  SET `status` = CASE `status`
    WHEN 'aktif'            THEN 'ACTIVE'
    WHEN 'dalam_perbaikan'  THEN 'UNDER_MAINTENANCE'
    WHEN 'nonaktif'         THEN 'INACTIVE'
    ELSE 'ACTIVE'
  END;
ALTER TABLE `facilities` MODIFY `status` ENUM('ACTIVE','UNDER_MAINTENANCE','INACTIVE') NOT NULL DEFAULT 'ACTIVE';

-- Step 3: reservations.status
-- (menunggu/disetujui/ditolak/dibatalkan_oleh_pengguna/dibatalkan_oleh_petugas/kedaluwarsa
--  -> PENDING/APPROVED/REJECTED/CANCELLED_BY_USER/CANCELLED_BY_OFFICER/EXPIRED)
ALTER TABLE `reservations` MODIFY `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING';
UPDATE `reservations`
  SET `status` = CASE `status`
    WHEN 'menunggu'                THEN 'PENDING'
    WHEN 'disetujui'               THEN 'APPROVED'
    WHEN 'ditolak'                 THEN 'REJECTED'
    WHEN 'dibatalkan_oleh_pengguna' THEN 'CANCELLED_BY_USER'
    WHEN 'dibatalkan_oleh_petugas'  THEN 'CANCELLED_BY_OFFICER'
    WHEN 'kedaluwarsa'             THEN 'EXPIRED'
    ELSE 'PENDING'
  END;
ALTER TABLE `reservations` MODIFY `status` ENUM('PENDING','APPROVED','REJECTED','CANCELLED_BY_USER','CANCELLED_BY_OFFICER','EXPIRED') NOT NULL DEFAULT 'PENDING';

-- Step 4: reports.status (baru/diproses/selesai/ditolak -> NEW/IN_PROGRESS/RESOLVED/REJECTED)
ALTER TABLE `reports` MODIFY `status` VARCHAR(32) NOT NULL DEFAULT 'NEW';
UPDATE `reports`
  SET `status` = CASE `status`
    WHEN 'baru'     THEN 'NEW'
    WHEN 'diproses' THEN 'IN_PROGRESS'
    WHEN 'selesai'  THEN 'RESOLVED'
    WHEN 'ditolak'  THEN 'REJECTED'
    ELSE 'NEW'
  END;
ALTER TABLE `reports` MODIFY `status` ENUM('NEW','IN_PROGRESS','RESOLVED','REJECTED') NOT NULL DEFAULT 'NEW';
