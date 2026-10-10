// Migrasi Production dijalankan lewat host **direct** (tanpa pooler). Neon
// menyediakan host `-pooler` berbasis PgBouncer untuk aplikasi, sementara
// Prisma Migrate mengandalkan advisory lock tingkat sesi: lewat pooler kunci
// itu bisa timeout (P1002) atau tertinggal pada koneksi server sehingga rilis
// berikutnya gagal mengambilnya.
//
// Sumber URL, berurutan:
//   1. DATABASE_URL_UNPOOLED bila diisi di environment Production;
//   2. DATABASE_URL dengan akhiran `-pooler` pada hostname dilepas.
// Kredensial tidak pernah dicetak; hanya hostname dan URL tersamarkan.

import { spawnSync } from "node:child_process"

const PROTOKOL_VALID = ["postgres:", "postgresql:", "prisma+postgres:"]
const dryRun = process.argv.includes("--dry-run")

export function lepasAkhiranPooler(url) {
  const cocok = /^([a-z][a-z0-9+.-]*:\/\/)([^/?#]*)([\s\S]*)$/i.exec(url)
  if (!cocok) return url
  const [, skema, otoritas, sisa] = cocok
  const posisiAt = otoritas.lastIndexOf("@")
  const kredensial = posisiAt === -1 ? "" : otoritas.slice(0, posisiAt + 1)
  const hostDanPort = posisiAt === -1 ? otoritas : otoritas.slice(posisiAt + 1)
  const [host, ...port] = hostDanPort.split(":")
  if (!host.includes("-pooler.")) return url
  return `${skema}${kredensial}${[host.replace("-pooler.", "."), ...port].join(":")}${sisa}`
}

export function samarkanKredensial(url) {
  return url.replace(/^([a-z][a-z0-9+.-]*:\/\/)([^/@]*@)/i, (_, skema, kredensial) => {
    const posisiTitikDua = kredensial.indexOf(":")
    const pengguna = posisiTitikDua === -1 ? kredensial.slice(0, -1) : kredensial.slice(0, posisiTitikDua)
    return `${skema}${pengguna}:***@`
  })
}

export function pilihUrlMigrasi(env) {
  const eksplisit = env.DATABASE_URL_UNPOOLED?.trim()
  if (eksplisit) return { url: eksplisit, sumber: "DATABASE_URL_UNPOOLED" }
  const dasar = env.DATABASE_URL?.trim()
  if (!dasar) {
    return { galat: "DATABASE_URL Production tidak tersedia; migrasi tidak dijalankan." }
  }
  const diturunkan = lepasAkhiranPooler(dasar)
  return {
    url: diturunkan,
    sumber: diturunkan === dasar ? "DATABASE_URL" : "DATABASE_URL (host direct diturunkan)",
  }
}

function jalankanMigrasi(url) {
  const hasil = spawnSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  })
  if (hasil.error) {
    console.error(`Gagal menjalankan Prisma Migrate: ${hasil.error.message}`)
    return 1
  }
  return hasil.status ?? 1
}

const pilihan = pilihUrlMigrasi(process.env)
if (pilihan.galat) {
  console.error(pilihan.galat)
  process.exitCode = 1
} else {
  let alamat
  try {
    alamat = new URL(pilihan.url)
  } catch {
    console.error("URL database migrasi tidak valid.")
    process.exitCode = 1
  }

  if (alamat && !PROTOKOL_VALID.includes(alamat.protocol)) {
    console.error("URL database migrasi harus memakai PostgreSQL.")
    process.exitCode = 1
  } else if (alamat) {
    if (alamat.host.includes("-pooler.")) {
      console.error(
        "Peringatan: host migrasi masih memakai pooler; advisory lock Prisma Migrate bisa timeout di sana.",
      )
      console.error("Setel DATABASE_URL_UNPOOLED ke koneksi direct Neon, atau biarkan host tanpa akhiran -pooler.")
    }
    console.log(`Migrasi memakai ${pilihan.sumber}: ${alamat.host}`)
    if (dryRun) {
      console.log(`URL (disamarkan): ${samarkanKredensial(pilihan.url)}`)
      console.log("Mode uji (--dry-run): perintah migrasi tidak dijalankan.")
    } else {
      process.exitCode = jalankanMigrasi(pilihan.url)
    }
  }
}
