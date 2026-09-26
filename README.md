# Ruvana

Ruvana adalah aplikasi web untuk reservasi dan pelaporan kerusakan fasilitas kampus. Pengunjung dapat melihat fasilitas; pengguna mengajukan reservasi dan laporan; petugas memproses antrean; admin mengelola akun dan memantau rekap.

## Fitur

- Daftar dan detail fasilitas kampus.
- Pengajuan reservasi dalam slot 30 menit pada jam operasional 07.00–20.00, beserta pemeriksaan ketersediaan.
- Riwayat dan detail reservasi pengguna.
- Laporan kerusakan dengan foto dan pemantauan status.
- Antrean reservasi dan laporan untuk petugas.
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
| `NEXT_PUBLIC_SITE_URL` | URL aplikasi untuk metadata publik; gunakan `http://localhost:3000` saat development. |

Jangan simpan kredensial production di `.env.example` atau README.

## Menjalankan secara lokal

Setelah mengatur `.env`, jalankan:

```bash
pnpm install
pnpm prisma generate
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000). `pnpm prisma generate` memerlukan `DATABASE_URL` di environment, tetapi tidak perlu koneksi database aktif. Seed dapat dijalankan kembali untuk mengisi atau memperbarui data contoh.

Untuk menghentikan PostgreSQL yang dijalankan dengan Docker Compose:

```bash
pnpm db:down
```

## Akun demo

Semua akun demo menggunakan password `password123`. Gunakan hanya pada lingkungan development.

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

- Push ke branch `main` memicu deployment Vercel.
- Database production menggunakan Prisma Postgres. Untuk menerapkan perubahan schema di production, gunakan `pnpm prisma migrate deploy`; `pnpm db:migrate` ditujukan untuk development.
- Simpan environment variable dan kredensial provider di konfigurasi environment Vercel, bukan di repository.
- Foto laporan saat ini menggunakan penyimpanan lokal development di `public/uploads/reports/`. PRD menetapkan private Vercel Blob sebagai target production; integrasi storage production perlu tersedia sebelum menerima upload foto di production.

Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan kontribusi.
