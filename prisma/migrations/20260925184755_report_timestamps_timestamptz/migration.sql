-- Audit sumber timezone:
-- - Kedua kolom lama adalah TIMESTAMP WITHOUT TIME ZONE. createdAt memakai
--   DEFAULT CURRENT_TIMESTAMP; updatedAt ditulis Prisma melalui @updatedAt.
-- - Laporan dan reservasi memakai koneksi PrismaPg serta pola timestamp lama
--   yang sama. Migration 20260924000000_reservation_native_date_tz secara
--   eksplisit mendokumentasikan createdAt/updatedAt reservasi lama sebagai
--   dinding UTC dari instant, lalu mengonversinya memakai AT TIME ZONE 'UTC'.
-- - Konvensi itu dipakai untuk kedua kolom laporan; jangan gunakan cast implisit
--   yang bergantung pada TimeZone sesi.
-- Audit lokal tidak dapat membaca baris lama: container PostgreSQL 16 berhenti
-- dan PGDATA-nya hanya tmpfs. Compose/container tidak menetapkan TZ atau PGTZ;
-- instance baru memakai Etc/UTC, tetapi bukan bukti langsung atas baris lama.

ALTER TABLE "reports"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC'),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');
