# Ruvana

Ruvana adalah aplikasi web untuk reservasi dan pelaporan kerusakan fasilitas kampus. Pengunjung dapat melihat fasilitas; pengguna mengajukan reservasi dan laporan; petugas memproses antrean; admin mengelola akun dan memantau rekap.

## Fitur

- Daftar dan detail fasilitas kampus.
- Pengajuan reservasi minimal 24 jam sebelum waktu mulai dalam slot 30 menit pada jam operasional 07.00–20.00, beserta pemeriksaan ketersediaan.
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
| `SEED_DEMO_PASSWORD` | Kata sandi unik 16–72 byte untuk akun demo lokal. Wajib saat `pnpm db:seed`. |

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

Akun demo menggunakan nilai `SEED_DEMO_PASSWORD` dari environment lokal. Seed menolak database non-lokal kecuali `SEED_ALLOW_NON_LOCAL=1` diberikan secara eksplisit; gunakan flag itu hanya untuk database non-produksi yang sudah diperiksa. Seed yang dijalankan ulang mengganti kata sandi demo yang berbeda dan mencabut sesi akun tersebut. Seed tidak mengaktifkan kembali akun demo yang sudah `DISABLED`; bila statusnya terlanjur berubah (mis. setelah `db:remediate-demo --apply` di database lokal), pulihkan dengan `pnpm prisma migrate reset --force` lalu `pnpm db:seed` — `migrate reset` di Prisma 7 tidak menjalankan seed, dan `SEED_DEMO_PASSWORD` harus terisi.

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

- Push ke branch `main` memicu CI. Bila CI lulus, workflow `Release Production` membuat deployment Vercel Production tanpa mengalihkan domain, menjalankan migrasi, lalu mempromosikan deployment. Auto-deployment Vercel dinonaktifkan di `vercel.json` agar traffic tidak mendahului migrasi.
- Database production menggunakan Prisma Postgres. Migrasi dijalankan oleh workflow melalui `pnpm exec prisma migrate deploy` dengan `DATABASE_URL` dari environment Production Vercel; `pnpm db:migrate` ditujukan untuk development. Build dan preview tidak menjalankan migrasi Production.
- Simpan environment variable dan kredensial provider di konfigurasi environment Vercel, bukan di repository.
- Siapkan GitHub environment bernama `production` dengan secret `VERCEL_TOKEN`, `VERCEL_ORG_ID`, dan `VERCEL_PROJECT_ID` yang mengarah ke proyek Vercel resmi. Bila perlu, aktifkan reviewer wajib untuk environment tersebut. Workflow hanya menerima hasil CI dari commit HEAD `main` pada repository ini.
- Variabel deployment Production: `DATABASE_URL` (Prisma Postgres), `NEXT_PUBLIC_SITE_URL` (URL kanonis), `ALLOWED_ORIGINS` (origin browser yang diizinkan), `BLOB_READ_WRITE_TOKEN` (foto laporan), dan `CRON_SECRET` (job kedaluwarsa reservasi). Jangan gunakan nilai contoh lokal untuk production.
- Isi `CRON_SECRET` dengan nilai acak panjang di Vercel Project Settings → Environment Variables, khusus **Production**. Vercel Cron mengirimkannya sebagai `Authorization: Bearer <CRON_SECRET>`. Setelah mengubah environment variable, lakukan redeploy production agar deployment aktif menerima nilainya.
- Verifikasi `GET /api/cron/expire-reservations` tanpa bearer mengembalikan 401; panggilan dengan bearer yang benar mengembalikan 200 berisi `expired` dan `processedAt`. Periksa log setelah siklus cron berikutnya untuk memastikan pesan `CRON_SECRET belum dikonfigurasi` tidak muncul lagi. Jangan menaruh secret pada URL, log, atau repository.
- Bila build bertahap, pemeriksaan variabel, atau migrasi gagal, workflow tidak mempromosikan deployment. Periksa log tanpa mencetak `DATABASE_URL`, cocokkan migrasi yang tertunda dengan `pnpm exec prisma migrate status` memakai environment Production, perbaiki penyebabnya, lalu jalankan ulang workflow yang gagal. Jangan menjalankan `migrate reset` atau rollback skema otomatis pada data Production. Setelah promosi, pastikan route yang membutuhkan kolom baru berhasil dan domain resmi menyajikan commit yang dirilis.
- Foto laporan saat ini menggunakan penyimpanan lokal development di `public/uploads/reports/`. PRD menetapkan private Vercel Blob sebagai target production; integrasi storage production perlu tersedia sebelum menerima upload foto di production.

### Admin awal dan akun demo yang pernah terpapar

1. Siapkan `DATABASE_URL` production dan nilai unik untuk `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, serta `BOOTSTRAP_ADMIN_PASSWORD` (16–72 byte) melalui environment aman. Jalankan `pnpm db:bootstrap-admin` untuk membuat admin tepercaya tanpa kata sandi bawaan. Perintah menolak email yang sudah terdaftar.
2. Berikan kata sandi demo lama yang terpapar melalui `COMPROMISED_DEMO_PASSWORD` di environment sementara; jangan menuliskannya di repo atau argumen perintah. Jalankan `pnpm db:remediate-demo` untuk audit tanpa perubahan. Tinjau jumlah reservasi, laporan, perubahan fasilitas, dan sesi aktif yang terkait sebelum melanjutkan.
3. Setelah admin baru siap dan hasil audit ditinjau, jalankan `pnpm exec tsx prisma/remediate-demo-accounts.ts --apply`. Skrip mengacak kata sandi, menonaktifkan setiap akun yang cocok, dan mencabut sesinya dalam transaksi; data reservasi dan laporan tetap tersimpan. Skrip menolak perubahan bila tidak ada admin aktif lain yang aman.
4. Pastikan login dengan kredensial demo lama menghasilkan 401. Audit log akses/auth production untuk aktivitas sebelumnya; tabel `sessions` hanya mencatat sesi yang masih ada dan tidak menyimpan seluruh riwayat login.

Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan kontribusi.
