<<<<<<< HEAD
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
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
>>>>>>> 2ad8782bb206b2f8fe944fa2cf6c438a547483d2
