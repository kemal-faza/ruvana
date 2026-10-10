-- windowAt menyimpan instant absolut agar batas login tidak bergantung pada zona
-- waktu sesi database. Sebelumnya kolomnya TIMESTAMP tanpa zona waktu, sehingga
-- maknanya bergantung pada zona waktu sesi penulis dan pembacanya.
-- Nilai lama adalah wall-clock lokal sesi yang menjalankan migrasi ini, jadi
-- konversinya memakai zona waktu sesi tersebut. Tabelnya hanya berisi jendela
-- pembatas login yang pendek, bukan data historis.
ALTER TABLE "login_attempts"
  ALTER COLUMN "windowAt" TYPE TIMESTAMPTZ(3)
  USING "windowAt" AT TIME ZONE current_setting('TimeZone');
