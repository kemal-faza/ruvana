-- CHECK constraint untuk jam operasional (07:00-20:00, slot 30 menit).
-- Kolom startTime/endTime adalah TIMESTAMP(3) (bukan TIME murni) setelah
-- migrasi ke Postgres — ambil bagian jam via EXTRACT / to_char.
ALTER TABLE "reservations"
  ADD CONSTRAINT "chk_jam_operasional" CHECK (
    to_char("startTime", 'HH24:MI') >= '07:00' AND
    to_char("endTime", 'HH24:MI') <= '20:00' AND
    "startTime" < "endTime"
  ),
  ADD CONSTRAINT "chk_slot_30menit" CHECK (
    EXTRACT(MINUTE FROM "startTime") IN (0, 30) AND
    EXTRACT(MINUTE FROM "endTime") IN (0, 30)
  );
