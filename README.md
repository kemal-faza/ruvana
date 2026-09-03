# Ruvana — Sistem Reservasi & Pelaporan Fasilitas Kampus

Aplikasi web untuk mengelola penggunaan fasilitas kampus (ruang kelas, aula,
laboratorium, alat, lapangan): cek ketersediaan, ajukan reservasi, dan laporkan
kerusakan. (Project PPK 2026 — sebelum UTS.)

## Tech Stack
Next.js 16 (App Router) · Prisma (PostgreSQL) · PostgreSQL 16 via Docker · Tailwind CSS

## Cara Menjalankan
1. Salin `.env.example` ke `.env` dan sesuaikan bila perlu.
2. `pnpm install`
3. `pnpm prisma generate` — generate Prisma Client ke `generated/` (folder ini di-ignore, harus di-generate tiap clone baru)
4. `pnpm db:up` — jalankan PostgreSQL via Docker Compose.
5. `pnpm db:migrate` — terapkan migrasi skema.
6. `pnpm db:seed` — isi akun demo & fasilitas contoh.
7. `pnpm dev` — buka http://localhost:3000

## Akun Demo
| Role | Email | Password |
|---|---|---|
| Admin | admin@ruvana.test | password123 |
| Petugas | petugas@ruvana.test | password123 |
| Pengguna | pengguna@ruvana.test | password123 |
| Pengguna (pending) | pending@ruvana.test | password123 |

## Pemetaan Model / Controller / View
| Lapisan | Lokasi | Isi |
|---|---|---|
| Model | `prisma/schema.prisma`, `generated/prisma`, `lib/prisma.ts` | Skema & akses DB |
| Controller | `app/` (server actions/route) + `lib/` (service) | Logika proses & validasi |
| View | `components/` + halaman `app/` | Tampilan |
| Config | `config/` | Konstanta bisnis |
