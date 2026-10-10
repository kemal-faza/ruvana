const required = [
  "DATABASE_URL",
  "BLOB_READ_WRITE_TOKEN",
  "NEXT_PUBLIC_SITE_URL",
  "ALLOWED_ORIGINS",
  "CRON_SECRET",
]

// `vercel env run` tidak dapat membaca variabel bertipe Secret karena nilainya
// write-only. Variabel wajib di bawah harus bertipe Config pada environment
// Production; periksa dengan `vercel env ls production`.
const missing = required.filter((name) => !process.env[name]?.trim())
if (missing.length > 0) {
  console.error(`Konfigurasi Production belum lengkap: ${missing.join(", ")}`)
  console.error("Isi setiap variabel di atas untuk environment Production dan pastikan tipenya Config.")
  console.error("Variabel bertipe Secret tidak dapat dibaca `vercel env run`; ubah tipenya atau sediakan nilainya lewat secret environment GitHub.")
  process.exitCode = 1
} else {
  let databaseUrl
  try {
    databaseUrl = new URL(process.env.DATABASE_URL)
  } catch {
    console.error("DATABASE_URL Production tidak valid.")
    process.exitCode = 1
  }

  if (databaseUrl && !["postgres:", "postgresql:", "prisma+postgres:"].includes(databaseUrl.protocol)) {
    console.error("DATABASE_URL Production harus memakai PostgreSQL.")
    process.exitCode = 1
  }
  if (databaseUrl && ["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname)) {
    console.error("DATABASE_URL Production masih menunjuk ke database lokal.")
    process.exitCode = 1
  }
  if (process.env.CRON_SECRET.length < 32) {
    console.error("CRON_SECRET Production harus berupa nilai acak panjang (minimal 32 karakter).")
    process.exitCode = 1
  }

  // NEXT_PUBLIC_SITE_URL dipakai metadata publik dan diverifikasi ulang setelah
  // promosi lewat `check-production-cron.mjs`. Validasi di sini berjalan SEBELUM
  // migrasi dan promosi, jadi salah konfigurasi tidak sempat mengubah production.
  let siteUrl
  try {
    siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL)
  } catch {
    console.error("NEXT_PUBLIC_SITE_URL Production tidak valid.")
    process.exitCode = 1
  }
  if (siteUrl) {
    if (siteUrl.protocol !== "https:") {
      console.error("NEXT_PUBLIC_SITE_URL Production harus memakai https.")
      process.exitCode = 1
    }
    if (["localhost", "127.0.0.1", "::1"].includes(siteUrl.hostname)) {
      console.error("NEXT_PUBLIC_SITE_URL Production masih menunjuk ke alamat lokal.")
      process.exitCode = 1
    }
    if (siteUrl.hostname === "vercel.app" || siteUrl.hostname.endsWith(".vercel.app")) {
      console.error(
        "NEXT_PUBLIC_SITE_URL Production menunjuk alias *.vercel.app yang dilindungi Deployment Protection (Vercel Authentication).",
      )
      console.error(
        "Permintaan anonim ke domain itu dialihkan ke SSO, sehingga verifikasi cron pada rilis akan gagal.",
      )
      console.error("Pakai domain kanonis publik, mis. https://ruvana.crunchy.my.id.")
      process.exitCode = 1
    }
  }
}

if (!process.exitCode) console.log("Konfigurasi wajib Production tersedia; nilai rahasia tidak dicetak.")
