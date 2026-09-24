-- Koreksi chk_jam_operasional: kolom startTime/endTime bertipe TIMESTAMP
-- WITHOUT TIME ZONE dan menyimpan dinding UTC dari instant reservasi
-- (lihat asiaJakartaToUtc). AT TIME ZONE pada tipe ini justru menggeser
-- ke arah yang salah sehingga slot valid >10:00 WIB ditolak.
-- Offset Jakarta tetap (UTC+7, tanpa DST) sehingga jam dinding Jakarta
-- = nilai tersimpan + 7 jam; ekspresi ini tidak bergantung TimeZone sesi.
ALTER TABLE "reservations" DROP CONSTRAINT "chk_jam_operasional";
ALTER TABLE "reservations"
  ADD CONSTRAINT "chk_jam_operasional" CHECK (
    to_char("startTime" + INTERVAL '7 hours', 'HH24:MI') >= '07:00' AND
    to_char("endTime" + INTERVAL '7 hours', 'HH24:MI') <= '20:00' AND
    "startTime" < "endTime"
  );
