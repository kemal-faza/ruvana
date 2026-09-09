# Keputusan Teknis Proyek Ruvana

Dokumen ini menjelaskan keputusan teknis yang berlaku untuk proyek Ruvana.
Tujuannya adalah memberi manusia dan agent jawaban yang sama tentang **apa yang
dipilih, mengapa dipilih, dan di mana keputusan itu berlaku**.

## Metadata

- **Status:** `accepted`
- **Terakhir ditinjau:** 2026-09-09
- **Pemilik:** tim Ruvana
- **Audiens:** anggota tim, reviewer, dan agent
- **Berlaku untuk:** repository dan deployment resmi Ruvana

## Cara membaca dokumen

Setiap keputusan memiliki ID stabil dan satu scope:

- `project-wide`: mengikat arsitektur dan implementasi di semua lingkungan;
- `development`: mengikat alur pengembangan bersama;
- `deployment`: mengikat deployment production.

Workaround yang hanya diperlukan oleh satu mesin atau satu pengguna bukan
keputusan proyek. Contohnya adalah konfigurasi khusus filesystem, container
runtime, atau jaringan lokal. Simpan petunjuk seperti itu di bagian setup lokal
`AGENTS.md`, bukan di dokumen ini.

Status keputusan:

- `accepted`: keputusan aktif;
- `superseded`: keputusan lama yang sudah digantikan;
- `deferred`: belum diputuskan dan tidak boleh dianggap sebagai aturan aktif.

## Ringkasan keputusan aktif

| ID | Scope | Keputusan |
|---|---|---|
| D-001 | `project-wide` | Next.js App Router, server-first, dalam satu aplikasi |
| D-002 | `project-wide` | TypeScript strict dan konvensi nilai domain terpusat |
| D-003 | `project-wide` | Prisma 7 dengan PostgreSQL adapter |
| D-004 | `project-wide` | PostgreSQL 16 sebagai database utama |
| D-005 | `project-wide` | Tailwind CSS v4 untuk styling |
| D-006 | `development` | pnpm 10 sebagai package manager |
| D-007 | `development` | TDD dan test otomatis wajib; pemilihan runner ditunda sampai test harness dibuat |
| D-008 | `deployment` | Vercel, Prisma Postgres, dan private Vercel Blob untuk production |

---

## D-001 — Satu aplikasi Next.js yang server-first

- **Status:** `accepted`
- **Scope:** `project-wide`

### Konteks

Ruvana adalah aplikasi reservasi dan pelaporan fasilitas yang memerlukan
autentikasi, form interaktif, validasi server dan client, serta pemisahan
Model/Controller/View. Lima anggota tim perlu bekerja tanpa mengelola frontend
dan backend sebagai deployment terpisah.

### Keputusan

Gunakan Next.js App Router dalam satu aplikasi dengan pendekatan server-first.
Pemetaan lapisannya adalah:

- **Model:** `prisma/` dan `lib/prisma.ts`;
- **Controller:** Route Handlers HTTP di `app/api/` dan service bisnis di `lib/`;
  Server Action untuk kebutuhan server-only hanya menjadi adapter tipis ke
  service;
- **View:** halaman `app/` dan komponen di `components/`;
- **Config:** nilai bisnis bersama di `config/`.

View tidak boleh mengakses Prisma atau memuat aturan bisnis. Folder `/views`
tidak dibuat karena pemisahan tanggung jawab sudah dinyatakan melalui struktur
di atas.

### Alasan

- Satu bahasa dan satu repository mengurangi koordinasi antaranggota.
- Route Handlers menyediakan kontrak HTTP, sedangkan service menjadi pemilik
  validasi dan aturan bisnis.
- App Router sesuai dengan scaffold dan kompetensi React yang sudah dimiliki tim.

### Konsekuensi

- Kode server dan client harus memiliki batas yang jelas.
- Validasi client meningkatkan pengalaman pengguna, tetapi validasi server tetap
  menjadi sumber kebenaran.
- Konvensi Next.js yang digunakan harus mengikuti dokumentasi versi yang
  terpasang di repository.

### Alternatif yang dipertimbangkan

| Alternatif | Trade-off utama |
|---|---|
| Vite + React dan Express | Batas frontend/backend eksplisit, tetapi menambah API, CORS, dan deployment terpisah. |
| Express + template server | Sederhana dan dekat dengan MVC tradisional, tetapi kurang cocok untuk interaksi client yang berkembang. |
| SvelteKit, Nuxt, Remix, atau Astro | Layak secara teknis, tetapi menambah biaya belajar tanpa kebutuhan proyek yang memaksa perpindahan. |

## D-002 — TypeScript strict dan konvensi nilai domain

- **Status:** `accepted`
- **Scope:** `project-wide`

### Konteks

Kontrak data dipakai lintas modul dan dikerjakan oleh anggota berbeda. Kesalahan
nama field atau status perlu ditemukan sebelum integrasi runtime.

### Keputusan

Gunakan TypeScript strict. Nilai teknis status menggunakan bahasa Inggris dalam
format `UPPER_SNAKE_CASE`. Role, tipe fasilitas, label UI, komentar domain, dan
istilah yang dilihat pengguna menggunakan bahasa Indonesia.

Daftar nilai bisnis disimpan di `config/business.ts` dan harus tetap sinkron
dengan enum di `prisma/schema.prisma`. Kontrak lintas modul didefinisikan satu
kali dan diimpor oleh produsen maupun konsumen.

### Alasan

- Compiler mendeteksi ketidakcocokan kontrak lebih awal.
- Nilai domain terpusat mencegah typo dan hardcode yang tersebar.
- Pemisahan nilai teknis dan label UI menjaga konsistensi tanpa mengorbankan
  keterbacaan bagi pengguna Indonesia.

### Konsekuensi

- Perubahan enum harus memperbarui schema, konfigurasi bisnis, dan seluruh
  konsumennya dalam perubahan yang sama.
- Type assertion tidak boleh dipakai untuk menutupi kontrak yang tidak sinkron.

### Alternatif yang dipertimbangkan

JavaScript tanpa pemeriksaan strict mengurangi penulisan tipe, tetapi memindahkan
kesalahan kontrak ke tahap integrasi atau runtime.

## D-003 — Prisma 7 dengan PostgreSQL adapter

- **Status:** `accepted`
- **Scope:** `project-wide`

### Konteks

Tim membutuhkan schema bersama, migrasi bertahap, seed yang dapat diulang, dan
akses database yang type-safe.

### Keputusan

Gunakan Prisma 7 dengan ketentuan berikut:

- generator `prisma-client` dengan output eksplisit ke `generated/prisma`;
- provider `postgresql`;
- adapter `@prisma/adapter-pg` dan driver `pg`;
- Prisma Client singleton dari `lib/prisma.ts` untuk kode aplikasi;
- konfigurasi datasource dan migrasi dari `prisma.config.ts`.

Import tipe dan client hasil generate dari `generated/prisma`, bukan langsung
dari `@prisma/client`.

### Alasan

- `schema.prisma` menjadi definisi model yang dibaca seluruh tim.
- Migrasi versioned mendukung perubahan bertahap per modul.
- Client hasil generate menjaga tipe query selaras dengan schema.
- Singleton mencegah pembuatan koneksi berulang saat development hot reload.

### Konsekuensi

- `DATABASE_URL` harus tersedia ketika Prisma Client di-generate.
- `generated/prisma` tidak disimpan di Git dan harus dibuat setelah clone.
- PostgreSQL CHECK constraint yang tidak dimodelkan Prisma harus ditambahkan
  melalui SQL migrasi manual.

### Alternatif yang dipertimbangkan

| Alternatif | Trade-off utama |
|---|---|
| Driver SQL langsung | Memberi kontrol SQL penuh, tetapi menambah mapping, gaya query, dan kontrak manual. |
| Sequelize atau TypeORM | Mendukung pola ORM serupa, tetapi tidak memberi keuntungan yang cukup untuk mengganti fondasi yang sudah berjalan. |
| Drizzle ORM | Lebih dekat ke SQL dan type-safe, tetapi perpindahan tidak memberi manfaat yang sebanding dengan biaya migrasi proyek. |

## D-004 — PostgreSQL 16 sebagai database utama

- **Status:** `accepted`
- **Scope:** `project-wide`

### Konteks

Ruvana membutuhkan database relasional untuk pengguna, fasilitas, reservasi,
dan laporan. Database development harus konsisten antaranggota dan database
production harus tersedia sebagai layanan managed.

### Keputusan

Gunakan PostgreSQL 16. Development bersama menggunakan service `postgres:16`
di `docker-compose.yml` dengan named volume dan healthcheck. Production
menggunakan PostgreSQL managed sesuai D-008.

Aturan konflik reservasi tetap wajib divalidasi oleh service server. Penambahan
exclusion constraint atau partial index khusus reservasi belum menjadi keputusan
aktif dan harus diputuskan saat modul reservasi membutuhkannya.

### Alasan

- Satu engine untuk development dan production mengurangi perbedaan perilaku.
- PostgreSQL tersedia pada target hosting managed yang dipilih.
- Fitur constraint dan index PostgreSQL mendukung penguatan aturan reservasi
  jika kelak diperlukan.

### Konsekuensi

- SQL referensi dari dialek MySQL/MariaDB harus disesuaikan sebelum digunakan.
- Perubahan schema production memakai `prisma migrate deploy`, bukan
  `prisma migrate dev`.
- Setup khusus satu mesin boleh memakai override lokal, tetapi tidak mengubah
  keputusan engine database proyek.

### Alternatif yang dipertimbangkan

| Alternatif | Trade-off utama |
|---|---|
| MariaDB atau MySQL | Familiar dan memadai, tetapi tidak selaras dengan target database managed yang dipilih. |
| SQLite | Setup lokal ringan, tetapi berbeda dari engine production dan kurang cocok untuk latihan deployment multi-user. |
| Instalasi database native | Dapat bekerja, tetapi lebih mudah menghasilkan perbedaan versi dan konfigurasi antaranggota. |

## D-005 — Tailwind CSS v4

- **Status:** `accepted`
- **Scope:** `project-wide`

### Konteks

Komponen UI dikerjakan beberapa anggota dan memerlukan cara styling yang
konsisten tanpa menambah component library besar sebelum dibutuhkan.

### Keputusan

Gunakan Tailwind CSS v4 sebagai fondasi styling. Reuse komponen dan token yang
sudah ada sebelum menambah dependency UI baru.

### Alasan

- Tailwind sudah menjadi bagian scaffold proyek.
- Utility bersama mengurangi variasi penamaan CSS antaranggota.
- Pendekatan ini cukup untuk form, daftar, dan halaman administrasi Ruvana.

### Konsekuensi

- Class yang berulang harus diekstrak menjadi komponen ketika sudah memiliki
  tanggung jawab UI yang jelas, bukan diabstraksikan secara spekulatif.
- Dependency komponen baru harus memiliki kebutuhan aksesibilitas atau perilaku
  yang tidak dipenuhi platform dan dependency yang sudah terpasang.

### Alternatif yang dipertimbangkan

Bootstrap, CSS Modules, dan component library lengkap tetap dapat memenuhi
kebutuhan visual, tetapi menambah konvensi atau dependency yang belum diperlukan.

## D-006 — pnpm 10 sebagai package manager

- **Status:** `accepted`
- **Scope:** `development`

### Konteks

Seluruh anggota dan CI harus menghasilkan dependency tree yang konsisten.

### Keputusan

Gunakan pnpm 10. Versi tepat yang berlaku berasal dari field `packageManager` di
`package.json`. CI menggunakan frozen lockfile.

### Alasan

- Lockfile dan versi package manager membuat instalasi dapat direproduksi.
- Model dependency pnpm yang ketat membantu mendeteksi phantom dependency.

### Konsekuensi

- Perubahan dependency harus memperbarui `pnpm-lock.yaml`.
- npm atau Yarn tidak digunakan untuk mengubah dependency repository ini.

### Alternatif yang dipertimbangkan

npm dan Yarn layak digunakan, tetapi tidak ada manfaat proyek yang membenarkan
lebih dari satu package manager.

## D-007 — TDD dan test otomatis untuk perilaku aplikasi

- **Status:** `accepted`
- **Scope:** `development`

### Konteks

Repository saat ini belum memiliki test framework atau test suite. Pemeriksaan
yang tersedia adalah lint, banned-word check, type generation, typecheck, dan
build. PRD mewajibkan test harness serta unit, integration, end-to-end, dan UAT
untuk perilaku aplikasi.

### Keputusan

Implementasi fitur dan bugfix mengikuti RED–GREEN–REFACTOR. Test otomatis wajib
untuk logika bisnis, integrasi data dan keamanan, serta alur pengguna utama.
Pilih runner ketika test harness diimplementasikan berdasarkan runtime yang
benar-benar digunakan; pilihan runner belum menjadi keputusan aktif.

### Alasan

- Strategi test mengikuti risiko dan batas sistem yang nyata.
- Penundaan nama runner menghindari dependency spekulatif tanpa menunda
  kewajiban menulis test.

### Konsekuensi

- Test harness harus tersedia sebelum logika bisnis dikirim.
- Sampai framework tersedia, verifikasi fondasi mengikuti rangkaian pemeriksaan
  wajib yang tercantum di `AGENTS.md`.

### Alternatif yang dipertimbangkan

Menetapkan Vitest, Jest, atau runner lain sekarang memberi nama lebih awal,
tetapi belum ada implementasi test harness yang membuktikan kecocokannya dengan
runtime proyek.

## D-008 — Vercel, Prisma Postgres, dan Vercel Blob untuk production

- **Status:** `accepted`
- **Scope:** `deployment`

### Konteks

Tim membutuhkan deployment Next.js, PostgreSQL managed, dan penyimpanan private
untuk foto laporan tanpa memelihara server sendiri.

### Keputusan

Deploy aplikasi production ke Vercel, gunakan Prisma Postgres sebagai database,
dan gunakan private Vercel Blob untuk foto laporan. PostgreSQL hanya menyimpan
referensi objek serta metadata yang diperlukan, bukan binary foto.
Auto-deployment Vercel hanya aktif untuk branch `main`, sesuai `vercel.json`.

### Alasan

- Vercel mendukung deployment Next.js secara langsung.
- Prisma Postgres menyediakan PostgreSQL managed yang selaras dengan engine
  development.
- Private Vercel Blob memisahkan objek foto dari data relasional.

### Konsekuensi

- Kredensial database dan storage production disimpan sebagai environment
  variable platform, bukan di repository.
- Migrasi production dijalankan dengan `prisma migrate deploy`.
- Perubahan pada branch selain `main` tidak memicu auto-deployment production.
- Batas free tier database dan storage harus dipantau sesuai PRD.

### Alternatif yang dipertimbangkan

Platform aplikasi, PostgreSQL managed, atau object storage lain tetap
memungkinkan, tetapi memerlukan keputusan pengganti dan pembaruan konfigurasi.

---

## Riwayat keputusan yang digantikan

### H-001 — MariaDB 11.4 untuk database

- **Status:** `superseded` oleh D-004
- **Scope saat aktif:** `project-wide`
- **Diterima:** 2026-09-02
- **Digantikan:** 2026-09-03

MariaDB 11.4 awalnya dipilih karena dekat dengan materi MySQL/MariaDB dan mudah
dijalankan melalui Docker. Keputusan berubah sebelum ada data production atau
logika bisnis yang perlu dimigrasikan. PostgreSQL dipilih agar engine lokal
selaras dengan target database managed dan agar fitur constraint/index PostgreSQL
tersedia ketika domain reservasi membutuhkannya.

### H-002 — Neon untuk database production

- **Status:** `superseded` oleh D-008
- **Scope saat aktif:** `deployment`
- **Digantikan:** sebelum peninjauan 2026-09-09

Neon sempat dipilih sebagai target PostgreSQL managed ketika proyek berpindah
dari MariaDB ke PostgreSQL. PRD final kemudian menetapkan Prisma Postgres sebagai
database production. D-008 mengikuti keputusan final tersebut.

## Sumber kebenaran

Jika terdapat perbedaan informasi, gunakan urutan berikut:

1. `TASK.md` untuk acceptance rule modul dan `docs/PRD.md` untuk requirement
   produk serta resolusi konflik; resolusi eksplisit yang lebih baru menggantikan
   nilai lama yang dinyatakan konflik;
2. source code dan konfigurasi aktif untuk keadaan implementasi;
3. `AGENTS.md` untuk aturan repository dan petunjuk environment;
4. dokumen ini untuk alasan, scope, konsekuensi, dan riwayat keputusan.

Referensi utama:

- `package.json` — versi dependency dan package manager;
- `prisma/schema.prisma` — provider, generator, model, dan enum;
- `prisma.config.ts` — datasource, migrasi, dan seed;
- `config/business.ts` — nilai bisnis bersama;
- `docs/PRD.md` — stack production, strategi test, dan keputusan final produk;
- `docker-compose.yml` — database development standar;
- `vercel.json` — kebijakan auto-deployment;
- `README.md` — setup umum dan pemetaan Model/Controller/View;
- `docs/superpowers/specs/2026-09-02-fase0-foundation-design.md` — konteks
  keputusan fondasi awal.

Versi patch dependency tidak diduplikasi di sini. Baca versi aktual dari
`package.json` dan lockfile.
