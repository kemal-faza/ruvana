-- Perbaikan chk_jam_operasional: kolom startTime/endTime masih bertipe
-- TIMESTAMP WITHOUT TIME ZONE dan menyimpan dinding UTC dari instant
-- reservasi (lihat asiaJakartaToUtc). Jam dinding Asia/Jakarta = nilai
-- tersimpan + 7 jam (offset Jakarta tetap, tanpa DST); ekspresi ini tidak
-- bergantung TimeZone sesi dan aman dijalankan pada database berisi data
-- (slot valid setelah ~10.00 WIB tetap lolos).
-- Catatan konsolidasi: revisi ini menggantikan ekspresi AT TIME ZONE yang
-- salah arah pada kolom tanpa timezone; migrasi
-- 20260923221833_fix_jam_operasional_interval dan migrasi tipe native
-- (DATE/TIMESTAMPTZ) menyelaraskan bentuk akhirnya.
ALTER TABLE "reservations" DROP CONSTRAINT "chk_jam_operasional";
ALTER TABLE "reservations"
  ADD CONSTRAINT "chk_jam_operasional" CHECK (
    to_char("startTime" + INTERVAL '7 hours', 'HH24:MI') >= '07:00' AND
    to_char("endTime" + INTERVAL '7 hours', 'HH24:MI') <= '20:00' AND
    "startTime" < "endTime"
  );
