-- Kontrak PRD Bagian 8 & 10 (Model Data Konseptual Reservation):
-- tanggal kalender Asia/Jakarta disimpan sebagai PostgreSQL DATE;
-- startTime/endTime/waktuDiproses/createdAt/updatedAt adalah instant absolut
-- (UTC) dan disimpan sebagai TIMESTAMPTZ.
--
-- Konversi data yang ada:
-- - tanggal menyimpan dinding UTC dari tengah malam Jakarta (lihat
--   asiaJakartaToUtc), sehingga tanggal Jakarta = nilai + 7 jam.
-- - startTime/endTime/waktuDiproses/createdAt/updatedAt menyimpan dinding UTC
--   dari instant yang benar, sehingga dikonversi dengan asumsi zona UTC.
ALTER TABLE "reservations" ALTER COLUMN "tanggal" TYPE DATE USING (("tanggal" + INTERVAL '7 hours')::date);
ALTER TABLE "reservations" ALTER COLUMN "startTime" TYPE TIMESTAMPTZ(3) USING ("startTime" AT TIME ZONE 'UTC');
ALTER TABLE "reservations" ALTER COLUMN "endTime" TYPE TIMESTAMPTZ(3) USING ("endTime" AT TIME ZONE 'UTC');
ALTER TABLE "reservations" ALTER COLUMN "waktuDiproses" TYPE TIMESTAMPTZ(3) USING ("waktuDiproses" AT TIME ZONE 'UTC');
ALTER TABLE "reservations" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING ("createdAt" AT TIME ZONE 'UTC');
ALTER TABLE "reservations" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING ("updatedAt" AT TIME ZONE 'UTC');

-- Di atas TIMESTAMPTZ, AT TIME ZONE sudah benar: bandingkan jam dinding
-- Asia/Jakarta dari instant UTC yang tersimpan.
ALTER TABLE "reservations" DROP CONSTRAINT "chk_jam_operasional";
ALTER TABLE "reservations"
  ADD CONSTRAINT "chk_jam_operasional" CHECK (
    to_char("startTime" AT TIME ZONE 'Asia/Jakarta', 'HH24:MI') >= '07:00' AND
    to_char("endTime" AT TIME ZONE 'Asia/Jakarta', 'HH24:MI') <= '20:00' AND
    "startTime" < "endTime"
  );
