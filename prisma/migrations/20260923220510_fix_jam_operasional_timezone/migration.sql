-- Perbaikan chk_jam_operasional: kolom startTime/endTime menyimpan instant UTC
-- (waktu lokal Asia/Jakarta dikonversi via asiaJakartaToUtc), sedangkan
-- to_char memakai TimeZone sesi DB (UTC) sehingga SEMUA insert valid
-- ditolak (error 23514 → 500). Bandingkan jam dinding Asia/Jakarta.
ALTER TABLE "reservations" DROP CONSTRAINT "chk_jam_operasional";
ALTER TABLE "reservations"
  ADD CONSTRAINT "chk_jam_operasional" CHECK (
    to_char("startTime" AT TIME ZONE 'Asia/Jakarta', 'HH24:MI') >= '07:00' AND
    to_char("endTime" AT TIME ZONE 'Asia/Jakarta', 'HH24:MI') <= '20:00' AND
    "startTime" < "endTime"
  );
