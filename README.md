# Ruvana

Ruvana adalah aplikasi web untuk reservasi dan pelaporan kerusakan fasilitas kampus. Pengunjung dapat melihat fasilitas; pengguna mengajukan reservasi dan laporan; petugas memproses antrean; admin mengelola akun dan memantau rekap.

## Fitur

- Daftar dan detail fasilitas kampus.
- Pengajuan reservasi minimal 14 hari (H−14) sebelum waktu mulai dalam slot 30 menit pada jam operasional 07.00–20.00, beserta pemeriksaan ketersediaan.
- Riwayat dan detail reservasi pengguna.
- Laporan kerusakan dengan foto dan pemantauan status.
- Antrean reservasi dan laporan untuk petugas.
- Ringkasan reservasi petugas (menunggu, disetujui termasuk yang sedang berlangsung, ditolak, lainnya).
- Rekap bulanan reservasi petugas (per status, per fasilitas, dan 6 bulan terakhir).
- Pengelolaan akun dan verifikasi pendaftaran oleh admin.
- Dashboard analitik penggunaan dan kerusakan dengan ekspor CSV, XLSX, dan PDF.

Detail perilaku dan aturan produk ada di [docs/PRD.md](docs/PRD.md).

## Tech stack

- Next.js 16 App Router, React 19, TypeScript 5, dan Tailwind CSS v4.
- Prisma 7 dengan adapter PostgreSQL dan PostgreSQL 16.
- pnpm 10.
- Vercel untuk hosting production dan Prisma Postgres untuk database production.

## Prasyarat

- Node.js `>=22.22.2`.
- pnpm `10.30.2`.
- Docker Compose untuk menjalankan PostgreSQL lokal. PostgreSQL 16 juga dapat dijalankan dengan tooling container lain.

## Environment lokal

Salin `.env.example` menjadi `.env`, lalu sesuaikan nilainya untuk PostgreSQL lokal:

```bash
cp .env.example .env
```

Variabel yang digunakan oleh konfigurasi lokal:

| Variabel | Kegunaan |
|---|---|
| `POSTGRES_DB` | Nama database pada Docker Compose. |
| `POSTGRES_USER` | Pengguna database lokal. |
| `POSTGRES_PASSWORD` | Password database lokal; contoh di `.env.example` hanya untuk development. |
| `POSTGRES_PORT` | Port PostgreSQL lokal. |
| `DATABASE_URL` | Koneksi Prisma dan aplikasi ke PostgreSQL. Wajib tersedia saat Prisma Client dibuat. |
| `NEXT_PUBLIC_SITE_URL` | URL aplikasi untuk metadata publik; gunakan `http://localhost:3001` saat development karena `pnpm dev` menjalankan server pada port 3001. |
| `SEED_DEMO_PASSWORD` | Kata sandi unik 8–72 byte untuk akun demo lokal. Wajib saat `pnpm db:seed`. |

Jangan simpan kredensial production di `.env.example` atau README.

## Menjalankan secara lokal

Setelah mengatur `.env`, termasuk `SEED_DEMO_PASSWORD` yang unik, jalankan:

```bash
pnpm install
pnpm prisma generate
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Buka [http://localhost:3001](http://localhost:3001). `pnpm prisma generate` memerlukan `DATABASE_URL` di environment, tetapi tidak perlu koneksi database aktif. Seed dapat dijalankan kembali untuk mengisi atau memperbarui data contoh.

Untuk menghentikan PostgreSQL yang dijalankan dengan Docker Compose:

```bash
pnpm db:down
```

## Akun demo

Akun demo memakai nilai `SEED_DEMO_PASSWORD` dari environment lokal. Menjalankan seed berulang kali mengganti kata sandi akun demo dan mencabut sesinya, tetapi tidak mengaktifkan kembali akun yang sudah `DISABLED`; langkah pemulihannya ada di [CONTRIBUTING.md](CONTRIBUTING.md#akun-demo-yang-nonaktif).

| Peran | Email | Status awal |
|---|---|---|
| Admin | `admin@ruvana.test` | Aktif |
| Petugas | `petugas@ruvana.test` | Aktif |
| Pengguna | `pengguna@ruvana.test` | Aktif |
| Pengguna (menunggu verifikasi) | `pending@ruvana.test` | Pending |

## Pemeriksaan lokal

Jalankan pemeriksaan dalam urutan yang sama dengan CI:

```bash
pnpm prisma generate
pnpm lint
pnpm check:banned
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

`next typegen` harus dijalankan sebelum TypeScript. `DATABASE_URL` tetap diperlukan saat Prisma Client dibuat. CI memakai Node.js 22, pnpm 10.30.2, dan `pnpm install --frozen-lockfile`.

## Arsitektur singkat

| Lapisan | Lokasi | Tanggung jawab |
|---|---|---|
| Model | `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`, `generated/prisma/`, `lib/prisma.ts` | Schema, migrasi, seed, dan akses Prisma. |
| Controller | `app/api/`, Server Actions di `app/`, `lib/` | Batas HTTP dan aturan bisnis melalui service. |
| View | Halaman dan layout App Router di `app/`, `components/` | Tampilan dan interaksi. View tidak menjalankan query Prisma atau memuat aturan bisnis. |
| Config | `config/` | Konstanta dan nilai bisnis terpusat. |

## Deployment production

- Push ke `main` memicu CI. Bila CI lulus, workflow `Release Production` menerapkan migrasi, membangun deployment, lalu mempromosikannya; auto-deployment Vercel mati.
- Migrasi production dijalankan `scripts/apply-production-migrations.mjs` (`pnpm exec prisma migrate deploy`) terhadap `DATABASE_URL` Production. `pnpm db:migrate` hanya untuk development.
- Environment variable dan kredensial provider disimpan di konfigurasi environment Vercel dan GitHub environment `production`, tidak di repository.
- Kebijakan deployment, daftar variabel dan secret, serta aturan domain kanonis ada di [docs/DECISION.md](docs/DECISION.md#d-008--vercel-prisma-postgres-dan-vercel-blob-untuk-production).
- Prosedur rilis, verifikasi, dan langkah saat rilis gagal ada di [CONTRIBUTING.md](CONTRIBUTING.md#rilis-production).

Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan kontribusi.
