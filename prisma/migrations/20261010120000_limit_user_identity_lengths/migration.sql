-- Batas identitas akun mengikuti PRD Bagian 11.1 dan config/business.ts.
-- Tanpa USING yang memotong isi: migrasi harus gagal bila data lama melampaui
-- batas, agar data tersebut diperbaiki secara sadar sebelum migrasi diulang.
-- Kolom password menyimpan hash; batas 8-72 byte kata sandi asli divalidasi
-- sebelum hashing oleh service dan tidak diterapkan pada panjang hash.
ALTER TABLE "users"
  ALTER COLUMN "nama" TYPE VARCHAR(100),
  ALTER COLUMN "email" TYPE VARCHAR(254);
