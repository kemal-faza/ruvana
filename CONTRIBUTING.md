# Berkontribusi ke Ruvana

Terima kasih sudah berkontribusi ke Ruvana. Panduan ini menjelaskan alur kerja
Git dan GitHub yang digunakan tim, mulai dari menyiapkan repository sampai
mengirim pull request (PR).

Aturan produk pada `docs/PRD.md`, aturan desain pada `docs/DESIGN.md`, dan aturan
teknis pada `AGENTS.md` tetap menjadi sumber utama. Jika panduan ini berbeda
dengan ketiganya, ikuti aturan yang lebih spesifik dan terbaru.

## Daftar Isi

- [Sebelum Mulai](#sebelum-mulai)
- [Prasyarat](#prasyarat)
- [Menyiapkan Repository Lokal](#menyiapkan-repository-lokal)
- [Memahami Status Perubahan Git](#memahami-status-perubahan-git)
- [File yang Tidak Boleh Di-commit](#file-yang-tidak-boleh-di-commit)
- [Memilih Task dan Menyinkronkan `main`](#memilih-task-dan-menyinkronkan-main)
- [Membuat Branch Kerja](#membuat-branch-kerja)
- [Aturan Implementasi Ruvana](#aturan-implementasi-ruvana)
- [Meninjau dan Men-stage Perubahan](#meninjau-dan-men-stage-perubahan)
- [Menulis Commit](#menulis-commit)
- [Menjalankan Tes](#menjalankan-tes)
- [Menjalankan Verifikasi Lokal](#menjalankan-verifikasi-lokal)
- [Menyinkronkan Branch Sebelum Push](#menyinkronkan-branch-sebelum-push)
- [Push dan Pull Request](#push-dan-pull-request)
- [Review dan Merge](#review-dan-merge)
- [Menangani Merge Conflict](#menangani-merge-conflict)
- [Masalah Umum](#masalah-umum)
- [Checklist Kontributor](#checklist-kontributor)
- [Glosarium Perintah Git](#glosarium-perintah-git)
- [Referensi](#referensi)

## Sebelum Mulai

1. Baca `docs/PRD.md` untuk memahami modul, acceptance criteria, dan dependensi
   antarmodul.
2. Koordinasikan task dengan anggota tim agar tidak ada dua orang mengubah area
   yang sama tanpa sengaja.
3. Kerjakan satu perubahan logis dalam satu branch.
4. Jangan mengerjakan fitur langsung pada `main`. Gunakan branch kerja dan
   ajukan PR ke `main`.
5. Jangan memasukkan perbaikan atau refactor yang tidak berkaitan dengan task.

Kontributor yang memiliki akses tulis dapat clone repository utama. Jika tidak
memiliki akses tulis, buat fork di GitHub, clone fork tersebut, lalu arahkan PR
ke repository utama.

## Prasyarat

Pastikan perangkat memiliki:

- Git;
- Node.js 22;
- pnpm 10.30.2;
- Docker dan Docker Compose untuk PostgreSQL 16;
- khusus rootless Podman di `/mnt/DATA`: Podman dan `podman-compose`; serta
- akses ke repository GitHub Ruvana.

Periksa versi tool utama:

```bash
git --version
node --version
pnpm --version
docker --version
# Khusus pengguna Podman:
podman --version
podman-compose --version
```

Atur identitas Git jika belum pernah dilakukan pada perangkat ini:

```bash
git config --global user.name "Nama Anda"
git config --global user.email "email@contoh.com"
```

Gunakan alamat email yang terhubung ke akun GitHub agar kontribusi tercatat
pada profil yang benar. Periksa konfigurasi aktif dengan
`git config --global --list`.

## Menyiapkan Repository Lokal

Clone repository dan masuk ke direktorinya. HTTPS adalah pilihan termudah jika
SSH key GitHub belum disiapkan:

```bash
git clone https://github.com/kemal-faza/ruvana.git
cd ruvana
```

Jika SSH key sudah terdaftar di GitHub, URL
`git@github.com:kemal-faza/ruvana.git` juga dapat digunakan. Ikuti
[panduan SSH GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
jika ingin menyiapkannya.

Jika bekerja melalui fork, clone fork milik sendiri sebagai `origin`, lalu
tambahkan repository utama sebagai `upstream`:

```bash
git clone https://github.com/nama-pengguna/ruvana.git
cd ruvana
git remote add upstream https://github.com/kemal-faza/ruvana.git
git remote -v
```

Pada alur fork, ambil pembaruan `main` dari `upstream`, tetapi push branch ke
`origin`.

Siapkan environment dan dependency:

```bash
cp .env.example .env
pnpm install
pnpm prisma generate
```

`prisma.config.ts` membutuhkan `DATABASE_URL`, termasuk ketika Prisma Client
dibuat. Nilai pengembangan lokal sudah dicontohkan di `.env.example`. Jangan
memasukkan `.env` ke Git.

Jalankan database, migrasi, seed, dan development server:

```bash
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Aplikasi tersedia di <http://localhost:3000>. Hentikan database dengan:

```bash
pnpm db:down
```

### Rootless Podman pada `/mnt/DATA`

Pada mesin pengembangan project ini yang menggunakan rootless Podman di
`/mnt/DATA`, jangan gunakan `pnpm db:up`. Gunakan override lokal yang diabaikan
Git:

```bash
podman-compose -f docker-compose.local.yml up -d
pnpm db:migrate
pnpm db:seed
```

Data PostgreSQL override tersebut disimpan pada `tmpfs`. Migrasi dan seed harus
dijalankan kembali setelah container dibuat ulang. Untuk menghentikannya:

```bash
podman-compose -f docker-compose.local.yml down
```

## Memahami Status Perubahan Git

File dalam working tree berpindah melalui beberapa keadaan:

1. **Untracked**: file baru yang belum dipantau Git.
2. **Modified**: file yang dipantau Git dan sudah diubah.
3. **Staged**: perubahan yang dipilih untuk commit berikutnya.
4. **Committed**: snapshot perubahan yang sudah tersimpan di riwayat lokal.
5. **Ignored**: file yang sengaja tidak dipantau berdasarkan `.gitignore`.

Periksa keadaan repository sesering mungkin:

```bash
git status
```

Pilih satu file untuk staging:

```bash
git add app/contoh/page.tsx
```

Batalkan staging tanpa membuang perubahan lokal:

```bash
git restore --staged app/contoh/page.tsx
```

Simpan perubahan staged sebagai commit:

```bash
git commit -m "feat(contoh): tambahkan halaman contoh"
```

## File yang Tidak Boleh Di-commit

`.gitignore` mencegah file lokal, rahasia, dan hasil generate masuk ke
repository. Di Ruvana, jangan commit:

- `.env` atau file environment lokal lain;
- `node_modules/`, `.next/`, dan output build;
- `generated/`, termasuk Prisma Client hasil generate;
- `.vercel/`;
- PDF dan dokumen lokal yang memang diabaikan;
- file SQL lokal, kecuali SQL migrasi Prisma dan inisialisasi PostgreSQL yang
  memang dikecualikan oleh `.gitignore`; serta
- compose override lokal, termasuk `docker-compose.local.yml`.

`.env.example` harus tetap tersedia sebagai contoh tanpa secret. Prisma Client
tidak di-commit; jalankan `pnpm prisma generate` untuk membuatnya secara lokal.

Periksa alasan sebuah file diabaikan:

```bash
git check-ignore -v .env
```

Jika file yang seharusnya diabaikan telanjur dipantau, hapus hanya dari Git
tanpa menghapus file lokal:

```bash
git rm --cached -- path/ke/file
```

Kemudian perbaiki `.gitignore` dan tinjau perubahan sebelum commit.

### Jika secret telanjur masuk ke commit

1. Jangan push commit tersebut.
2. Beri tahu maintainer dan hapus secret dari perubahan serta riwayat lokal
   yang belum dibagikan.
3. Jika commit sudah terkirim ke remote, anggap secret telah bocor: segera
   rotasi atau cabut secret tersebut.
4. Koordinasikan pembersihan riwayat dengan maintainer. Jangan melakukan force
   push sendiri karena dapat merusak pekerjaan anggota lain.

Menghapus teks secret dari commit terbaru tidak membuat secret yang sudah
terkirim menjadi aman. Rotasi tetap wajib.

## Memilih Task dan Menyinkronkan `main`

Pilih task berdasarkan pembagian modul, urutan dependensi, dan acceptance criteria
di `docs/PRD.md`. Gunakan ID requirement (`IAM-01`, `FAC-02`, `RES-06`, dan
seterusnya) sebagai identitas task sekaligus batas perubahan. Pembagian pemilik
ada pada bagian Ownership Tim, urutan milestone pada bagian Urutan Milestone, dan
pemetaan user story ke requirement pada bagian Traceability 17 User Story.
Ringkasan urutan pengerjaannya:

1. **Fase 1:** Modul 1 Authentication & Access Control (Developer 1) dan Modul 2
   Facility & Discovery (Developer 2) dikerjakan paralel setelah fondasi Fase 0.
2. **Fase 2:** Modul 3 Reservation (Developer 3) dan Modul 4 Reporting &
   Maintenance (Developer 4) dikerjakan paralel setelah login dan role Modul 1
   tersedia. Task tertentu tetap mengikuti dependensi Modul 2 yang tercantum
   pada `docs/PRD.md`.
3. **Fase 3:** Modul 5 Admin & Analytics (PM) dikerjakan setelah role
   admin serta data Modul 2, 3, dan 4 tersedia.
4. **Fase 4:** Orchestrator dan semua anggota melakukan integrasi lintas modul,
   pengujian menyeluruh, dokumentasi, dan aset presentasi.

Modul 4 `REP-04` menjadi pemicu perubahan status fasilitas, sedangkan Modul 3
`RES-09` menjadi listener pembatalan reservasi. Pemilik kedua modul wajib
menyepakati dan memakai kontrak di `lib/facility-status-contract.ts`; keduanya
dapat dikerjakan paralel tanpa menyalin implementasi satu sama lain.

Sebelum membuat branch baru, sinkronkan `main` lokal:

```bash
git switch main
git fetch origin
git pull --ff-only origin main
```

`git fetch` mengambil informasi terbaru tanpa mengubah working tree.
`git pull --ff-only` memperbarui `main` hanya jika dapat dilakukan tanpa membuat
merge commit tak terduga.

Kontributor yang menggunakan fork harus mengganti remote sumber pembaruan
dengan `upstream`:

```bash
git fetch upstream
git pull --ff-only upstream main
```

Pastikan working tree bersih sebelum berpindah branch:

```bash
git status
```

## Membuat Branch Kerja

Buat branch dari `main` yang sudah terbaru:

```bash
git switch -c feature/modul-3-reservasi
```

Gunakan nama singkat dengan kebab-case dan prefix yang sesuai:

| Prefix | Kegunaan | Contoh |
| --- | --- | --- |
| `feature/` | Fitur baru | `feature/modul-3-reservasi` |
| `fix/` | Perbaikan bug biasa | `fix/validasi-jadwal` |
| `hotfix/` | Perbaikan produksi yang mendesak | `hotfix/gagal-login` |
| `chore/` | Tooling atau pemeliharaan | `chore/perbarui-eslint` |
| `docs/` | Dokumentasi saja | `docs/panduan-kontribusi` |

Perintah branch yang umum:

```bash
git branch
git switch nama-branch
git switch -c nama-branch-baru
```

## Aturan Implementasi Ruvana

### Pisahkan Model, Controller, dan View

- **Model**: `prisma/schema.prisma`, migrasi, dan `lib/prisma.ts`.
- **Controller**: Server Actions dan route handlers di bawah `app/`, ditambah
  service bisnis di `lib/`.
- **View**: komponen di `components/` serta rendering page/layout di `app/`.
- **Config**: nilai bisnis bersama di `config/business.ts`.

Jangan membuat direktori `/views`. View tidak boleh menjalankan query Prisma
atau memuat aturan bisnis. Kode aplikasi harus memakai singleton dari
`lib/prisma.ts`, dan tipe Prisma harus diimpor dari `generated/prisma`, bukan
langsung dari `@prisma/client`.

### Ikuti aturan domain

- Status teknis menggunakan bahasa Inggris. Role, tipe fasilitas, label domain
  untuk pengguna, komentar, dan pesan commit menggunakan bahasa Indonesia.
- Slot reservasi berdurasi 30 menit dari 07.00 sampai 20.00.
- Validasi waktu, tanggal lampau, status fasilitas, dan bentrok dilakukan pada
  server. Form penting juga harus melakukan validasi client-side.
- Reservasi `PENDING` boleh saling bertumpuk. Hanya reservasi `APPROVED` yang
  memblokir slot, dan approval wajib memeriksa konflik sekali lagi.
- Perubahan status fasilitas menjadi `UNDER_MAINTENANCE` membatalkan reservasi
  `APPROVED` di masa depan melalui `lib/facility-status-contract.ts`: Modul 4
  menjadi pemicu dan Modul 3 menjadi listener. Jangan menyalin perilaku lintas
  modul tersebut ke lokasi lain.
- Jangan hardcode nilai bisnis di UI atau service. Gunakan
  `config/business.ts` dan jaga daftar statusnya tetap sinkron dengan
  `prisma/schema.prisma`.
- Perubahan schema PostgreSQL harus mengikuti aturan migrasi pada `AGENTS.md`.
  Produksi menggunakan `pnpm prisma migrate deploy`, bukan `migrate dev`.

### Validasi dan keamanan

- Validasi input di batas sistem dan tampilkan pesan error yang aman bagi
  pengguna.
- Jangan mempercayai validasi client sebagai satu-satunya perlindungan.
- Jangan mencatat password, token, connection string, atau data sensitif lain.
- Jangan menonaktifkan error handling, pemeriksaan akses, hook, atau CI agar
  perubahan terlihat berhasil.

## Meninjau dan Men-stage Perubahan

Tinjau perubahan sebelum memilih file untuk commit:

```bash
git status
git diff
```

Stage hanya file yang berhubungan dengan satu perubahan logis:

```bash
git add app/reservasi/actions.ts
git add lib/reservation-service.ts
```

Hindari membiasakan `git add .` karena perintah tersebut mudah memasukkan file
yang tidak terkait atau sensitif. Jika beberapa bagian dalam satu file perlu
dipisah, gunakan patch staging:

```bash
git add -p path/ke/file
```

Periksa snapshot yang benar-benar akan di-commit:

```bash
git diff --staged
git status
```

Untuk membatalkan staging satu file tanpa kehilangan edit:

```bash
git restore --staged path/ke/file
```

Untuk membuang perubahan lokal yang belum di-commit, gunakan
`git restore path/ke/file` hanya setelah memastikan perubahan tersebut memang
tidak diperlukan. Perintah ini tidak dapat dipulihkan dengan mudah.

## Menulis Commit

Gunakan format Conventional Commits:

```text
<type>(<scope>): <deskripsi singkat>
```

Scope bersifat opsional. Type yang digunakan:

| Type | Kegunaan |
| --- | --- |
| `feat` | Menambah fitur |
| `fix` | Memperbaiki bug |
| `docs` | Mengubah dokumentasi |
| `style` | Mengubah format tanpa mengubah perilaku |
| `refactor` | Merapikan struktur tanpa mengubah perilaku |
| `perf` | Meningkatkan performa |
| `test` | Menambah atau memperbaiki pengujian |
| `chore` | Pemeliharaan atau tooling |
| `ci` | Mengubah pipeline CI/CD |
| `revert` | Membatalkan commit sebelumnya |

Tulis deskripsi dalam bentuk perintah, huruf kecil, bahasa Indonesia, tanpa
titik di akhir, dan idealnya sepanjang 50–72 karakter. Contoh:

```bash
git commit -m "feat(reservasi): tambahkan validasi bentrok jadwal"
git commit -m "fix(fasilitas): cegah pemesanan ruang nonaktif"
git commit -m "docs: tambahkan panduan kontribusi"
```

Satu commit harus atomic: hanya memuat satu tujuan yang dapat dijelaskan dan
ditinjau secara mandiri. Jangan mencampur fitur, refactor tak terkait, dan
perubahan format dalam commit yang sama.

Gunakan body ketika alasan atau dampaknya tidak cukup jelas dari judul:

```bash
git commit -m "fix(reservasi): periksa konflik saat approval" \
  -m "Pemeriksaan ulang mencegah dua reservasi pending disetujui untuk slot yang sama."
```

## Menjalankan Tes

Tes unit dan integrasi memakai Vitest dengan environment jsdom, dan diletakkan
**co-located**: file tes berada di samping modul yang diuji, misalnya
`components/ui/button.test.tsx` untuk `components/ui/button.tsx`. Import modul
lewat alias `@/` supaya lokasinya tidak berpengaruh. Konfigurasi ada di
`vitest.config.mts` dengan setup bersama di `vitest.setup.ts`.

```bash
pnpm test          # sekali jalan (dipakai CI)
pnpm test:watch    # mode watch saat mengembangkan
```

Gunakan penamaan `*.test.ts` / `*.test.tsx`. Pemeriksaan aksesibilitas memakai
`vitest-axe`, misalnya pada `components/app-shell/app-shell.test.tsx`.

Pemeriksaan browser sungguhan (Playwright) belum ada. Suite lama di `tests/`
hanya menguji halaman showcase `/baseline-ui` dan tidak pernah dijalankan CI,
sehingga baseline-nya membusuk tanpa terdeteksi. Tambahkan kembali e2e ketika
rute produk yang stabil sudah cukup banyak — saat itu, tulislah spec terhadap
alur produk (fasilitas, reservasi, approval), bukan halaman showcase. Paket
`@playwright/test` masih terpasang karena dipakai `pnpm measure:motion`
(`scripts/measure-motion-frames.mjs`) untuk mengukur budget biaya frame motion.

## Menjalankan Verifikasi Lokal

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

Pastikan `DATABASE_URL` tersedia melalui `.env` sebelum menjalankan Prisma atau
build. `next typegen` harus dijalankan sebelum TypeScript karena project memakai
route types yang dihasilkan Next.js.

Hook Husky menjalankan pemeriksaan kata terlarang terhadap file staged sebelum
commit. Jika hook gagal, baca pesannya, perbaiki penyebabnya, stage ulang, dan
buat commit baru. Jangan melewati hook dengan `--no-verify`. CI juga menjalankan
pemeriksaan repository secara penuh pada PR menuju `main` dan pada push
langsung ke `main`. Push ke branch fitur belum memicu workflow tersebut sampai
PR dibuka.

Jika perubahan memerlukan database, jalankan alur terkait juga:

```bash
pnpm db:migrate
pnpm db:seed
```

## Menyinkronkan Branch Sebelum Push

Ambil perubahan terbaru dari remote:

```bash
git fetch origin
```

Untuk branch pribadi dari clone repository utama yang belum pernah di-push atau
dibagikan, rapikan commit di atas `main` terbaru dengan:

```bash
git rebase origin/main
```

Pada alur fork, sumber kebenarannya adalah `upstream/main`:

```bash
git fetch upstream
git rebase upstream/main
```

Jangan rebase branch yang sedang dipakai bersama karena rebase menulis ulang
riwayat. Untuk branch PR yang sudah dibagikan, sinkronkan tanpa menulis ulang
riwayat:

```bash
git merge origin/main
```

Untuk branch PR dari fork, gunakan `git merge upstream/main`, bukan
`origin/main`.

Setelah sinkronisasi, jalankan kembali pemeriksaan yang relevan. Jika rebase atau
merge menimbulkan konflik, ikuti bagian
[Menangani Merge Conflict](#menangani-merge-conflict).

## Push dan Pull Request

Push pertama sekaligus memasang upstream branch:

```bash
git push -u origin feature/modul-3-reservasi
```

Untuk push berikutnya cukup gunakan:

```bash
git push
```

Buka PR di GitHub dengan target `main`. Isi deskripsi PR dengan:

- ringkasan perubahan dan alasan perubahan;
- task, issue, atau modul terkait;
- langkah pengujian yang sudah dijalankan;
- screenshot sebelum/sesudah untuk perubahan UI;
- perubahan schema, migrasi, seed, atau konfigurasi yang perlu diketahui; dan
- risiko atau dampak terhadap modul lain.

Pastikan diff PR tidak memuat `.env`, secret, generated files, debug log, atau
perubahan yang tidak terkait. Deployment otomatis Vercel hanya berasal dari
`main`, bukan dari setiap branch.

## Review dan Merge

1. Tunggu seluruh pemeriksaan CI lulus.
2. Tanggapi komentar reviewer secara teknis dan jelas.
3. Tambahkan perbaikan review sebagai commit baru agar perubahan mudah dilihat.
4. Minta review ulang setelah perubahan penting.
5. Gunakan metode merge yang disepakati maintainer.
6. Setelah PR di-merge, perbarui `main` lokal dan hapus branch yang sudah tidak
   diperlukan.

```bash
git switch main
git pull --ff-only origin main
git branch -d feature/modul-3-reservasi
```

Pada alur fork, perbarui `main` lokal dari `upstream/main`. Jika ingin menjaga
`main` pada fork tetap sama, push hasil fast-forward tersebut ke `origin main`.

```bash
git fetch upstream
git switch main
git merge --ff-only upstream/main
git push origin main
```

Gunakan `git branch -d` sebagai default agar Git menolak menghapus branch yang
belum tergabung. Setelah squash merge, Git lokal mungkin tetap menolak `-d`.
Hanya setelah memastikan PR sudah di-merge dan hasilnya tersedia di `main`,
branch lokal tersebut boleh dihapus dengan
`git branch -D feature/modul-3-reservasi`.

## Menangani Merge Conflict

Konflik terjadi ketika Git tidak dapat menggabungkan perubahan secara otomatis.
Periksa file yang konflik:

```bash
git status
```

Git menandai bagian yang perlu dipilih:

```text
<<<<<<< HEAD
perubahan pada branch saat ini
=======
perubahan yang masuk
>>>>>>> origin/main
```

Untuk menyelesaikannya:

1. Buka setiap file konflik.
2. Pahami kedua perubahan dan pilih atau gabungkan hasil yang benar.
3. Hapus seluruh marker `<<<<<<<`, `=======`, dan `>>>>>>>`.
4. Stage file yang sudah selesai dengan `git add path/ke/file`.
5. Lanjutkan operasi yang sedang berjalan.

Jika sedang rebase:

```bash
git rebase --continue
```

Jika sedang merge, selesaikan merge setelah semua konflik staged:

```bash
git commit
```

Jika belum yakin dan ingin kembali ke keadaan sebelum operasi:

```bash
git rebase --abort
# atau, bila operasi yang aktif adalah merge:
git merge --abort
```

Jangan hanya menghapus marker tanpa memahami perilaku yang harus dipertahankan.
Setelah selesai, jalankan kembali verifikasi lokal dan uji alur yang terdampak.

## Masalah Umum

### Import Prisma atau TypeScript gagal

Prisma Client mungkin belum dibuat karena `generated/` tidak di-commit:

```bash
pnpm prisma generate
```

Pastikan `.env` ada dan memuat `DATABASE_URL` yang valid.

### `LayoutProps` atau route type tidak ditemukan

Generate route types sebelum typecheck:

```bash
pnpm exec next typegen
pnpm exec tsc --noEmit
```

### Migrasi atau seed tidak dapat terhubung

Periksa kesehatan container:

```bash
docker compose ps
```

Kemudian pastikan `DATABASE_URL` menunjuk ke database lokal yang benar. Pada
rootless Podman `/mnt/DATA`, periksa compose override dengan:

```bash
podman-compose -f docker-compose.local.yml ps
```

Gunakan alur `docker-compose.local.yml` yang dijelaskan sebelumnya.

### Commit ditolak hook

Jalankan pemeriksaan secara manual, perbaiki file yang dilaporkan, lalu stage
ulang:

```bash
pnpm check:banned
git add path/ke/file-yang-diperbaiki
git commit -m "<type>(<scope>): <deskripsi>"
```

Jangan gunakan `--no-verify` untuk melewati pemeriksaan.

### Push ditolak karena remote lebih baru

Push non-fast-forward biasanya berarti branch kerja di `origin` memiliki commit
yang belum ada secara lokal. Jangan langsung force push. Ambil remote branch
kerja yang sama, tinjau commit-nya, lalu gabungkan:

```bash
git fetch origin
git log --oneline HEAD..origin/feature/modul-3-reservasi
git merge origin/feature/modul-3-reservasi
git push
```

Ganti `feature/modul-3-reservasi` dengan nama branch yang sedang digunakan.
`origin` tetap menjadi tujuan push baik pada clone langsung maupun fork. Jika
commit remote berasal dari anggota lain atau tidak dikenali, koordinasikan lebih
dahulu; jangan menimpa riwayat branch bersama. Pembaruan base `main` merupakan
kasus berbeda dan mengikuti bagian
[Menyinkronkan Branch Sebelum Push](#menyinkronkan-branch-sebelum-push).

## Checklist Kontributor

### Sebelum commit

- [ ] Perubahan hanya mencakup satu tujuan logis.
- [ ] Acceptance criteria di `docs/PRD.md` sudah terpenuhi.
- [ ] Model, Controller, View, dan config tetap terpisah.
- [ ] Validasi, error handling, akses, dan keamanan tidak dilewati.
- [ ] Tidak ada secret, `.env`, generated files, atau debug log.
- [ ] `git diff` dan `git diff --staged` sudah ditinjau.
- [ ] Pemeriksaan yang relevan sudah lulus.
- [ ] Pesan commit mengikuti Conventional Commits dan berbahasa Indonesia.

### Sebelum pull request

- [ ] Branch sudah disinkronkan dengan `origin/main` untuk clone langsung atau
      `upstream/main` untuk fork.
- [ ] Seluruh urutan verifikasi lokal sudah lulus.
- [ ] Migrasi dan seed diuji jika schema atau data awal berubah.
- [ ] Tidak ada perubahan di luar scope pada diff PR.
- [ ] Deskripsi PR menjelaskan apa, mengapa, dan cara menguji.
- [ ] Screenshot disertakan jika tampilan berubah.
- [ ] Dampak lintas modul dan risiko dijelaskan.
- [ ] Target PR adalah `main` dan CI lulus.

## Glosarium Perintah Git

| Perintah | Fungsi |
| --- | --- |
| `git clone <url>` | Menyalin repository remote ke lokal |
| `git status` | Melihat keadaan working tree dan staging area |
| `git diff` | Melihat perubahan yang belum staged |
| `git diff --staged` | Melihat perubahan yang akan di-commit |
| `git add <path>` | Memilih perubahan untuk commit berikutnya |
| `git add -p <path>` | Memilih bagian perubahan secara interaktif |
| `git restore --staged <path>` | Membatalkan staging tanpa membuang edit |
| `git restore <path>` | Membuang edit lokal yang belum di-commit |
| `git check-ignore -v <path>` | Menjelaskan aturan ignore yang cocok dengan file |
| `git rm --cached -- <path>` | Menghapus file dari tracking tanpa menghapus file lokal |
| `git commit -m "pesan"` | Menyimpan snapshot staged ke riwayat lokal |
| `git log --oneline` | Melihat ringkasan riwayat commit |
| `git branch` | Melihat daftar branch lokal |
| `git switch <branch>` | Berpindah branch |
| `git switch -c <branch>` | Membuat dan berpindah ke branch baru |
| `git fetch origin` | Mengambil informasi terbaru tanpa menggabungkannya |
| `git pull --ff-only origin main` | Memperbarui branch tanpa merge commit baru |
| `git merge origin/main` | Menggabungkan `main` remote ke branch saat ini |
| `git rebase origin/main` | Memindahkan commit lokal ke atas `main` terbaru |
| `git rebase --continue` | Melanjutkan rebase setelah konflik diselesaikan |
| `git rebase --abort` | Membatalkan rebase dan kembali ke keadaan awal |
| `git merge --abort` | Membatalkan merge yang sedang berkonflik |
| `git remote -v` | Melihat remote dan URL-nya |
| `git push -u origin <branch>` | Push pertama dan memasang upstream |
| `git push` | Mengirim commit berikutnya ke upstream |
| `git branch -d <branch>` | Menghapus branch lokal yang sudah tergabung |

## Referensi

- [Git & GitHub 101](https://github.com/Doctor3131/ppk-pertemuan-1/blob/main/git%20%26%20github%20101.md)
- [`README.md`](README.md)
- [`docs/PRD.md`](docs/PRD.md)
- [`AGENTS.md`](AGENTS.md)
