# TASK.md — Sistem Reservasi & Pelaporan Fasilitas Kampus

> Dokumen pembagian tugas & rencana kerja untuk **Pengembangan Platform Khusus 2026 (Sebelum UTS)**.
> Sumber ketentuan: `Project PPK 2026.pdf`. Dokumen ini berisi breakdown task per modul (detail, tanpa kode), skema database konseptual, urutan pengerjaan, dan matriks pembagian tim.
> **Deadline:** 11 Oktober 2026 pukul 12.00 WIB (Via Kulon) · **Presentasi UTS:** TBA.

---

## 0. Ringkasan Proyek

| Aspek | Detail |
|---|---|
| Nama aplikasi | Ruvana — Sistem Reservasi & Pelaporan Fasilitas Kampus |
| Tujuan | Mengelola penggunaan fasilitas kampus (ruang kelas, aula, laboratorium, alat, lapangan): cek ketersediaan, reservasi, pelaporan kerusakan, pemrosesan terpusat oleh petugas & admin |
| Stack | Next.js (App Router) + ORM + MySQL/MariaDB |
| Cakupan dokumen | Modul 1–5: Authentication, Facility & Discovery, Reservation, Reporting & Maintenance, Admin & Analytics |
| Repo | GitHub/GitLab bersama (wajib) — setiap anggota commit dengan pesan jelas |

### Aturan implementasi (dari PDF — wajib dipatuhi semua modul)
1. **Authentication** wajib ada: registrasi, login, logout.
2. **Struktur kode dipisah minimal** antara: koneksi DB (model), tampilan (view), dan logika proses (controller).
3. **Validasi data** dilakukan di sisi **server DAN client** untuk form penting.
4. **UI/UX** mudah digunakan.

### Aturan bisnis global (dari PDF — berlaku lintas modul)
- **Jam operasional:** 07.00–20.00.
- **Slot reservasi tetap 30 menit** (mis. 07.00–07.30, 07.30–08.00, dst.).
- `start_time` & `end_time` reservasi **wajib** dalam jam operasional dan kelipatan 30 menit — **validasi dilakukan di sisi server**, bukan hanya di tampilan kalender.
- Konflik jadwal dicegah sistem **saat persetujuan**: dalam satu slot, hanya boleh ada satu reservasi berstatus **disetujui** per fasilitas (US#9). Reservasi **menunggu** boleh overlap (bersaing) — lihat §2.2 & Modul 3.

---

## 1. Aktor & Role

| Aktor | Login? | Hak akses | Modul terkait |
|---|---|---|---|
| **Pengunjung** | Tidak | Lihat daftar fasilitas + ketersediaan jadwal per slot (tersedia/tidak tersedia) — tanpa detail pemohon/tujuan | 2 |
| **Pengguna** (mahasiswa/dosen/staf) | Ya | Ajukan & batalkan reservasi sendiri, lihat riwayat; lapor kerusakan & lihat status laporan | 3, 4 |
| **Petugas** | Ya | Proses antrian reservasi (approve/reject/cancel) & laporan (ubah status + catatan resolusi); perbarui status ketersediaan fasilitas (termasuk "dalam perbaikan") | 3, 4 |
| **Admin** | Ya | Kelola data master fasilitas; daftarkan akun petugas & pengguna langsung; verifikasi/tolak akun hasil registrasi mandiri; lihat & ekspor rekap | 5 |
| **Orchestrator** (peran tim) | — | Koordinasi, integrasi antar-modul, QA/uji lintas modul, dokumentasi & aset presentasi | semua |

> Catatan status akun: akun hasil **registrasi mandiri** berstatus *pending* dan baru bisa login setelah **diverifikasi admin** (US#15).

---

## 2. Arsitektur & Fondasi

### 2.1 Pemetaan struktur folder (sesuai ketentuan PDF)

| Kebutuhan PDF | Implementasi di proyek |
|---|---|
| Koneksi DB (model) | Lapisan model via ORM: definisi skema/tabel + akses data (query) terpusat |
| Logika proses (controller) | Server logic (route/action) yang memuat aturan bisnis: validasi slot, cek konflik, transisi status |
| Tampilan (view) | UI pages/komponen (server-rendered) yang hanya menampilkan data hasil controller |
| Konfigurasi | File konfigurasi terpusat: kredensial DB (env), konstanta bisnis (jam operasional, durasi slot, batas pembatalan), daftar role/status |

**Konvensi folder proyek (sesuai ketentuan PDF — target, pendekatan A+C):**
- `/public` → aset statis (gambar/logo, termasuk foto unggahan laporan yang disajikan publik).
- `/app` → routing, server logic/controller (validasi, aturan bisnis, transisi status), dan halaman (view).
- `/components` → komponen UI reusable (lapisan view).
- `/prisma` → model layer (skema + migrasi + seed).
- `/lib` → helper/utilitas + Prisma Client singleton + kontrak interface.
- `/config` → kredensial DB via env + konstanta bisnis terpusat (jam operasional, durasi slot, batas pembatalan, daftar role/status).
- Folder `/views` literal **tidak dibuat** (bukan konvensi Next.js) — pemisahan Model/Controller/View dijelaskan lewat struktur di atas + **README pemetaan** (lihat Fase 0 / design doc), yang memenuhi ketentuan dosen.

> Prinsip: view **tidak boleh** berisi query DB atau aturan bisnis; model **tidak boleh** mengurus tampilan; aturan bisnis hidup di controller/service layer, bukan tersebar di komponen UI.

### 2.2 Skema database konseptual (dasar — boleh ditambah asumsi/atribut)

**Users**
- id, nama, email, password (hash), role (pengguna/petugas/admin — akses "pengunjung" = tanpa sesi, **tidak** disimpan sebagai baris Users), status akun (pending/aktif/ditolak/dinonaktifkan — registrasi mandiri mulai `pending`, verifikasi admin → `aktif`/`ditolak`, akun buatan admin langsung `aktif`), dibuat_oleh (untuk akun buatan admin), waktu_daftar, waktu_verifikasi

**Facilities**
- id, nama, tipe (ruang kelas/aula/laboratorium/alat/lapangan), lokasi, kapasitas, deskripsi, status ketersediaan (aktif/dalam perbaikan/nonaktif)

**Reservations**
- id, user_id (pemesan), facility_id, tanggal, start_time, end_time (kelipatan 30 menit, dalam 07.00–20.00), tujuan penggunaan, status (menunggu/disetujui/ditolak/dibatalkan_oleh_pengguna/dibatalkan_oleh_petugas/kedaluwarsa), alasan_penolakan/pembatalan, diproses_oleh (petugas), waktu_pengajuan, waktu_diproses
- **Aturan overlap:** Dua reservasi berstatus **menunggu** BOLEH overlap di slot yang sama (mereka "bersaing"). Yang **dilarang** overlap hanya yang berstatus **disetujui** — dicek di **logika aplikasi saat petugas approve** (US#9), bukan saat pengajuan.

**Reports**
- id, user_id (pelapor), facility_id, kategori, deskripsi, foto, status (baru/diproses/selesai/ditolak), catatan_resolusi, ditangani_oleh (petugas), waktu_dibuat, waktu_selesai

> **Status fasilitas vs reservasi (konsistensi):** saat petugas menandai fasilitas *dalam perbaikan*, sistem **otomatis membatalkan** reservasi masa depan berstatus *disetujui* pada fasilitas tersebut (alasan: "fasilitas dalam perbaikan"). Saat fasilitas kembali *aktif*, slot tersedia lagi untuk reservasi baru.
>
> **Pembagian kepemilikan aturan ini (anti deadlock antar-modul):** efek "pembatalan otomatis" **dimiliki Modul 3** (TASK 3.7) dan **dipicu oleh Modul 4** (TASK 4.4) melalui satu **kontrak interface "status fasilitas berubah"** yang didefinisikan sekali di Fase 0 (nama event/hook + data yang dikirim: facility_id, status baru, waktu). Modul 3 implementasi listener-nya terhadap kontrak itu; Modul 4 cukup memanggil/memicu kontrak saat status berubah. Dengan cara ini B dan C bisa maju paralel tanpa saling menunggu implementasi.

### 2.3 Setup lingkungan (Fase 0 — dikerjakan bersama, dikoordinasi orchestrator)

- Siapkan repo bersama, branch strategy sederhana (mis. `main` + branch fitur per modul), aturan commit.
- Buat **skeleton folder** sesuai konvensi di §2.1 (`/public`, `/app`, `/components`, `/prisma`, `/lib`, `/config` — tanpa `/views` literal; pemisahan lapisan via README pemetaan) agar struktur awal sudah memenuhi pembagian folder yang diminta PDF.
- Siapkan environment: Next.js + ORM + MySQL/MariaDB (lokal/Docker), file konfigurasi env.
- Buat skema DB (tabel Users, Facilities, Reservations, Reports + relasi) & **seed data** (contoh fasilitas lintas tipe + contoh akun per role; contoh reservasi/laporan menyusul saat Modul 3/4).
- Tulis konstanta bisnis terpusat di konfigurasi: jam operasional (07.00–20.00), durasi slot (30 menit), batas pembatalan pengguna (H−2 jam sebelum mulai, lihat Modul 3), daftar status.
- **Definisikan kontrak interface "status fasilitas berubah"** (nama event/hook + data yang dikirim: facility_id, status baru, waktu) — dipakai TASK 3.7 (listener) & TASK 4.4 (pemicu) agar modul 3 & 4 tidak saling menunggu.
- Setup halaman dasar & navigasi (landing sederhana) agar tiap anggota punya kerangka yang sama.

---

## 3. Urutan Pengerjaan (Dependency Order)

> Logika: **Auth di awal** karena modul 3/4/5 butuh identitas & role. Modul 2 (browsing publik) tidak butuh login sehingga bisa jalan paralel dengan Auth.

| Fase | Yang dikerjakan | Pemilik | Ketergantungan |
|---|---|---|---|
| Fase 0 | Setup repo, DB, seed, konstanta, kerangka halaman | Semua (orkestrasi: Orchestrator) | — |
| Fase 1 | **Modul 1 Auth** (D) ‖ **Modul 2 Facility & Discovery** (A) — paralel | A & D | Fase 0 |
| Fase 2 | **Modul 3 Reservation** (B) ‖ **Modul 4 Reporting & Maintenance** (C) — paralel | B & C | Fase 0 + Modul 1 (login & role) |
| Fase 3 | **Modul 5 Admin & Analytics** (D) | D | Fase 0 + Modul 1 (role admin) + data Modul 2/3/4 (agar rekap bermakna) |
| Fase 4 | Integrasi lintas modul, uji menyeluruh, dokumentasi & aset presentasi | Orchestrator + semua | Semua modul |

> Setiap modul bersifat **independen secara interface**: masing-masing menyelesaikan task-nya tanpa memblokir modul lain selama dependensi (Auth, data) sudah tersedia. Integrasi & pengujian end-to-end difasilitasi Orchestrator di Fase 4.

---

## 4. Format Task per Modul

Setiap modul di bawah menggunakan format task yang sama:

```
TASK Mx.y — <judul>
- Tujuan      : ...
- Langkah     : <langkah kerja konkret, tanpa kode>
- Aturan/Validasi : <aturan bisnis & validasi yang wajib>
- Acceptance  : <kriteria selesai yang bisa diverifikasi>
- US          : <nomor user story yang dipenuhi, bila ada>
- Dependensi  : <task/modul yang harus selesai lebih dulu, bila ada>
```

---

## 5. MODUL 1 — Authentication & Access Control (Pemilik: D)

### TASK 1.1 — Registrasi mandiri pengguna
- **Tujuan:** Mahasiswa/dosen/staf mendaftar sendiri.
- **Langkah:** Form registrasi (nama, email, password) → simpan dengan role *pengguna* & status *pending* → tampilkan pesan "menunggu verifikasi admin".
- **Aturan/Validasi:** validasi server + client (email valid & unik, password memenuhi syarat minimal). Akun *pending* **belum bisa login**.
- **Acceptance:** Pengguna baru tersimpan berstatus pending; login sebelum verifikasi ditolak.
- **US:** #15 (sebagian).

### TASK 1.2 — Login & logout
- **Langkah:** Form login (email + password) → autentikasi → buat sesi → arahkan sesuai role (pengguna/petugas/admin) → tombol logout mengakhiri sesi.
- **Aturan/Validasi:** Hanya akun berstatus **aktif** yang bisa login; akun *pending* mendapat pesan jelas; *feedback* error login generik & aman (tidak membocorkan akun mana yang terdaftar). Proteksi sesi & logout aman.
- **Acceptance:** Login sukses per role masuk ke area masing-masing; login akun pending/dinonaktifkan ditolak dengan pesan; logout mengakhiri sesi.
- **US:** (dari Ketentuan Umum PDF) registrasi/login/logout.
- **Dependensi:** TASK 1.1.

### TASK 1.3 — Role & access control (guard)
- **Langkah:** Terapkan pembatas akses per role di sisi server (bukan hanya sembunyikan tombol di UI): route/aksi yang butuh login → wajib sesi aktif; aksi khusus petugas/admin → wajib role sesuai; akses data dibatasi milik sendiri untuk pengguna biasa.
- **Acceptance:** Pengunjung tak bisa membuka halaman pengguna/petugas/admin; pengguna tak bisa membuka halaman petugas/admin; pengguna hanya bisa mengakses data miliknya (reservasi/laporan sendiri).
- **US:** #1 (sebagian), fondasi #3–#17.
- **Dependensi:** TASK 1.2.

---

## 6. MODUL 2 — Facility & Discovery (Pemilik: A)

### TASK 2.1 — Daftar fasilitas (publik)
- **Tujuan:** Pengunjung & pengguna melihat daftar fasilitas beserta statusnya.
- **Langkah:** Halaman daftar fasilitas (kartu/daftar) menampilkan: nama, tipe, lokasi, kapasitas, deskripsi singkat, dan **status ketersediaan saat ini** (aktif/dalam perbaikan/nonaktif).
- **Acceptance:** Semua fasilitas aktif & dalam perbaikan tampil; pengunjung bisa membuka halaman ini **tanpa login**.
- **US:** #1 (sebagian), #2 (sebagian).

### TASK 2.2 — Detail fasilitas & jadwal ketersediaan per slot
- **Tujuan:** Pengunjung/pengguna melihat ketersediaan jadwal per slot 30 menit (tersedia/tidak tersedia) untuk suatu fasilitas — **tanpa** melihat detail pemohon atau tujuan penggunaan.
- **Langkah:** Halaman detail per fasilitas → pilih tanggal → tampilkan grid slot 07.00–20.00 (26 slot). Slot berlabel **tidak tersedia** jika ada reservasi berstatus **disetujui**, atau fasilitas berstatus *dalam perbaikan/nonaktif*. Slot dengan reservasi **menunggu** tetap tampil tersedia (boleh diajukan — pengajuan "bersaing"), opsional dengan penanda halus "ada pengajuan menunggu" tanpa membocorkan pemohon/tujuan.
- **Aturan/Validasi:** "Tidak tersedia" = slot sudah **disetujui** (atau fasilitas *dalam perbaikan/nonaktif*). Reservasi **menunggu tidak memblokir slot** — konsisten dengan aturan overlap di Modul 3 (TASK 3.1: pending boleh overlap).
- **Acceptance:** Grid slot benar: slot disetujui / fasilitas tidak aktif tampil tidak tersedia; slot ber-menunggu tetap bisa dipilih; tanpa login tetap bisa melihat status slot.
- **US:** #1.

### TASK 2.3 — Pencarian & filter fasilitas
- **Langkah:** Form pencarian/filter: kata kunci nama, **tipe** (ruang kelas/aula/lab/alat/lapangan), **lokasi**, dan filter **kapasitas** (minimal). Tampilkan hasil yang cocok; state kosong jelas saat tak ada hasil.
- **Aturan/Validasi:** Filter dikombinasikan (AND); kapasitas = kapasitas minimum.
- **Acceptance:** Filter tipe/lokasi/kapasitas & kata kunci berfungsi sesuai data seed; tanpa login tetap bisa.
- **US:** #2.
- **Dependensi:** TASK 2.1.

### TASK 2.4 — Integrasi ketersediaan dengan status perbaikan
- **Langkah:** Pastikan tampilan publik (daftar & detail) otomatis mencerminkan perubahan status dari Modul 4: fasilitas *dalam perbaikan* tampil sebagai tidak tersedia/bertanda; kembali *aktif* setelah selesai.
- **Acceptance:** Perubahan status oleh petugas (Modul 4) langsung terlihat di daftar & grid slot publik.
- **Dependensi:** TASK 2.2 + antarmuka status fasilitas Modul 4.

---

## 7. MODUL 3 — Reservation (Pemilik: B)

### TASK 3.1 — Ajukan reservasi (grid slot)
- **Tujuan:** Pengguna login memilih slot tersedia & mengajukan reservasi dengan tujuan penggunaan.
- **Langkah:** Pilih fasilitas → tanggal → pilih **satu atau lebih slot 30 menit berurutan** dari grid ketersediaan → isi tujuan penggunaan → ajukan → status awal **menunggu**.
- **Aturan/Validasi (server, bukan hanya UI):**
  - Rentang waktu dalam 07.00–20.00 & kelipatan 30 menit.
  - Tidak boleh tumpang-tindih dengan reservasi berstatus **disetujui** pada fasilitas & slot sama (reservasi **menunggu boleh overlap** — pengajuan bersaing; konflik antar-menunggu diselesaikan saat approve).
  - Fasilitas berstatus *dalam perbaikan* atau *nonaktif* tidak bisa direservasi.
  - Tidak boleh reservasi di masa lalu.
  - Validasi server + client.
- **Acceptance:** Reservasi valid tersimpan berstatus menunggu (termasuk saat ada menunggu lain di slot sama); upaya reservasi bentrok dengan disetujui / di luar jam / di masa lalu / fasilitas nonaktif **ditolak server**.
- **US:** #3.
- **Dependensi:** Auth (login), Modul 2 (grid slot).

### TASK 3.2 — Riwayat & detail reservasi pengguna
- **Langkah:** Halaman "Reservasi Saya": daftar riwayat (semua status) milik pengguna yang login + halaman/panel detail lengkap (fasilitas, waktu, tujuan, status, alasan bila ditolak/dibatalkan).
- **Acceptance:** Pengguna hanya melihat reservasi miliknya; detail lengkap & status terkini tampil.
- **US:** #5.
- **Dependensi:** TASK 3.1, TASK 1.3 (guard milik-sendiri).

### TASK 3.3 — Pembatalan oleh pengguna
- **Langkah:** Tombol batalkan pada reservasi miliknya (status menunggu/disetujui) dengan konfirmasi; batas waktu **H−2 jam sebelum waktu mulai**; simpan alasan/keterangan pembatalan — sistem mencatat status **dibatalkan_oleh_pengguna**.
- **Aturan/Validasi:** Pembatalan ditolak jika sudah < 2 jam sebelum mulai (pesan: hubungi petugas); hanya pemilik yang bisa membatalkan.
- **Acceptance:** Pembatalan di dalam batas berhasil & slot kembali tersedia (bila tadi disetujui); di luar batas ditolak.
- **US:** #4.
- **Dependensi:** TASK 3.1, TASK 3.2.

### TASK 3.4 — Antrian & pemrosesan reservasi oleh petugas
- **Tujuan:** Petugas melihat dashboard/antrian reservasi berstatus **menunggu** & memproses manual.
- **Langkah:** Antrian reservasi menunggu (urut sesuai waktu pengajuan) → petugas lihat detail → **approve** atau **reject** (wajib isi alasan saat menolak) → sistem catat petugas pemroses & waktu proses.
- **Aturan/Validasi:** Saat **approve**, sistem **mencegah bentrok** (double-check server: fasilitas & slot sama sudah ada yang **disetujui** → tolak/peringatkan; beberapa *menunggu* di slot sama diselesaikan di sini — yang pertama di-approve menang, sisanya bisa ditolak/diinformasikan). Saat fasilitas berubah *dalam perbaikan*, reservasi terafiliasi ditangani sesuai aturan Modul 4.
- **Acceptance:** Antrian hanya berisi yang belum diproses; approve yang bentrok ditolak sistem; reject memerlukan alasan; pengguna melihat status baru di riwayat.
- **US:** #8 (sebagian), #9.
- **Dependensi:** TASK 3.1, Auth (role petugas).

### TASK 3.5 — Pembatalan mendesak oleh petugas
- **Langkah:** Petugas membatalkan reservasi berstatus **disetujui** (kondisi mendesak, mis. fasilitas mendadak tak bisa dipakai) dengan **alasan wajib** — sistem mencatat status **dibatalkan_oleh_petugas**; pengguna mendapat keterangan alasan di riwayat.
- **Acceptance:** Pembatalan mendesak tersimpan dengan alasan (status dibatalkan_oleh_petugas); slot kembali tersedia.
- **US:** #10.
- **Dependensi:** TASK 3.4.

### TASK 3.6 — Kedaluwarsa reservasi menunggu (auto-cleanup)
- **Langkah:** Reservasi berstatus **menunggu** yang slotnya sudah lewat tanpa diproses otomatis menjadi **kedaluwarsa**.
- **Acceptance:** Reservasi menunggu yang melewati waktu mulainya berubah ke status kedaluwarsa (otomatis/terjadwal); tidak lagi muncul di antrian aktif.
- **US:** #8 (sebagian).
- **Dependensi:** TASK 3.4.

### TASK 3.7 — Pembatalan otomatis reservasi saat fasilitas diperbaiki (listener)
- **Tujuan:** Memastikan aturan lintas-modul berjalan: begitu fasilitas berubah ke *dalam perbaikan*, reservasi yang terdampak ikut dibatalkan otomatis.
- **Langkah:** Implementasikan **listener** terhadap kontrak interface "status fasilitas berubah" (didefinisikan Fase 0, dipicu TASK 4.4): saat fasilitas menjadi *dalam perbaikan*, semua reservasi masa depan berstatus **disetujui** pada fasilitas itu **otomatis dibatalkan** dengan status **dibatalkan_oleh_petugas** & alasan otomatis "fasilitas dalam perbaikan"; saat kembali *aktif*, tidak ada aksi tambahan (slot otomatis tersedia lagi).
- **Acceptance:** Saat kontrak dipicu dengan status *dalam perbaikan*, reservasi terafiliasi berstatus disetujui langsung berubah ke dibatalkan_oleh_petugas (alasan otomatis) & slot bebas. (Pengujian menyeluruh dengan UI Modul 4 dilakukan di Fase 4 integrasi.)
- **US:** #10, #12 (bagian integrasi).
- **Dependensi:** TASK 3.5 + kontrak interface "status fasilitas berubah" (Fase 0). Tidak menunggu implementasi Modul 4 — cukup kontraknya.

---

## 8. MODUL 4 — Reporting & Maintenance (Pemilik: C)

### TASK 4.1 — Ajukan laporan kerusakan
- **Tujuan:** Pengguna login melaporkan kerusakan/masalah fasilitas.
- **Langkah:** Form laporan: pilih fasilitas, pilih **kategori** (dropdown/opsi), tulis **deskripsi**, unggah **foto** → kirim → status awal **baru**. Pengguna melihat daftar laporannya sendiri.
- **Aturan/Validasi:** **Foto wajib** dilampirkan (US#6 menyebut foto sebagai bagian laporan); validasi tipe & ukuran file di server; fasilitas yang dipilih harus valid.
- **Acceptance:** Laporan tersimpan (baru) dengan foto tersimpan aman; hanya pelapor yang melihat laporannya.
- **US:** #6.
- **Dependensi:** Auth (login), Modul 2 (daftar fasilitas).

### TASK 4.2 — Status laporan untuk pengguna
- **Langkah:** Pada daftar laporan milik pengguna, tampilkan status laporan (baru/diproses/selesai/ditolak) beserta pembaruan.
- **Acceptance:** Pengguna melihat status terkini laporannya.
- **US:** #7.
- **Dependensi:** TASK 4.1.

### TASK 4.3 — Antrian & pemrosesan laporan oleh petugas
- **Langkah:** Antrian laporan berstatus **baru** → petugas buka detail (termasuk lihat foto) → ubah status menjadi **diproses** / **selesai** / **ditolak** → saat menutup (selesai/ditolak) isi **catatan resolusi** → sistem catat petugas pemroses.
- **Acceptance:** Antrian hanya berisi laporan baru; transisi status terekam; laporan selesai/ditolak wajib punya catatan resolusi; pelapor melihat status & catatan.
- **US:** #8 (sebagian), #11.
- **Dependensi:** TASK 4.1, Auth (role petugas).

### TASK 4.4 — Tandai fasilitas "dalam perbaikan" & kembalikan ke aktif (pemicu)
- **Langkah:** Dari laporan yang sedang ditangani, petugas dapat menandai fasilitas terkait berstatus **dalam perbaikan** (opsional dari laporan, atau dari halaman fasilitas) → saat perbaikan selesai, kembalikan ke **aktif**. Setiap perubahan status **memicu kontrak interface "status fasilitas berubah"** (didefinisikan Fase 0) yang listener-nya ada di Modul 3 (TASK 3.7).
- **Aturan/Validasi:** Efek menandai *dalam perbaikan*: (1) slot fasilitas menjadi tidak tersedia di publik (Modul 2 — lewat pembacaan status fasilitas), (2) reservasi masa depan berstatus disetujui **otomatis dibatalkan** — dieksekusi oleh listener Modul 3/TASK 3.7 yang dipicu dari sini. Pastikan kedua efek terjadi.
- **Acceptance:** Fasilitas berubah tidak tersedia saat dalam perbaikan & kembali aktif setelah selesai; efek pembatalan otomatis terjadi (via pemicuan kontrak); tercatat siapa & kapan perubahan.
- **US:** #12.
- **Dependensi:** TASK 4.3 + kontrak interface "status fasilitas berubah" (Fase 0). Listener Modul 3 (TASK 3.7) dikerjakan paralel — bukan prasyarat.

---

## 9. MODUL 5 — Admin & Analytics (Pemilik: D)

### TASK 5.1 — Pendaftaran langsung akun petugas
- **Langkah:** Admin membuat akun **petugas** langsung (form: nama, email, password awal) — petugas **tidak** melakukan registrasi mandiri dalam kondisi apa pun.
- **Acceptance:** Akun petugas aktif langsung dibuat admin; tidak ada alur registrasi mandiri petugas.
- **US:** #13.
- **Dependensi:** Auth (role admin).

### TASK 5.2 — Pendaftaran langsung akun pengguna
- **Langkah:** Admin membuat akun pengguna (mahasiswa/dosen/staf) langsung tanpa lewat registrasi mandiri.
- **Acceptance:** Akun pengguna aktif langsung dibuat admin.
- **US:** #14.
- **Dependensi:** Auth (role admin).

### TASK 5.3 — Verifikasi akun hasil registrasi mandiri
- **Langkah:** Halaman daftar akun berstatus **pending** → admin melihat detail → **verifikasi** (aktifkan) atau **tolak** → akun baru bisa login setelah diverifikasi.
- **Acceptance:** Akun pending hanya aktif setelah diverifikasi admin; yang ditolak tidak bisa login.
- **US:** #15.
- **Dependensi:** Modul 1 (registrasi mandiri, TASK 1.1).

### TASK 5.4 — User management (kelola akun)
- **Langkah:** Daftar semua akun (role, status, waktu daftar) → cari/filter → nonaktifkan/aktifkan akun → (opsional) ubah role.
- **Acceptance:** Admin bisa menonaktifkan akun (langsung tak bisa login) & mengaktifkan kembali.
- **US:** penunjang #13–#15.

### TASK 5.5 — Facility management (CRUD + nonaktifkan)
- **Langkah:** Halaman kelola fasilitas: tambah, edit (nama/tipe/lokasi/kapasitas/deskripsi), dan **nonaktifkan** (bukan hapus permanen) fasilitas.
- **Aturan/Validasi:** Fasilitas **nonaktif** tidak muncul/tidak bisa direservasi; fasilitas dengan reservasi/laporan terkait tetap aman (nonaktifkan, bukan hapus). Validasi server + client pada form.
- **Acceptance:** CRUD berfungsi; fasilitas nonaktif tak bisa direservasi; data historis tetap utuh.
- **US:** #16.
- **Dependensi:** Modul 2 (data fasilitas), Auth (role admin).

### TASK 5.6 — Dashboard rekap (okupansi & frekuensi kerusakan)
- **Langkah:** Halaman admin menampilkan rekap lintas fasilitas: **okupansi fasilitas** (pemanfaatan slot terdisetujui per fasilitas/lokasi dalam rentang waktu) & **frekuensi kerusakan** per fasilitas/lokasi (jumlah laporan per kategori/status). Filter rentang tanggal & (opsional) per fasilitas/lokasi.
- **Acceptance:** Angka rekap konsisten dengan data reservasi & laporan; dapat difilter per rentang/lokasi.
- **US:** #17 (sebagian).
- **Dependensi:** Data Modul 3 & 4.

### TASK 5.7 — Ekspor rekap (CSV, Excel, PDF)
- **Langkah:** Tombol ekspor pada halaman rekap untuk mengunduh rekap dalam **3 format: CSV, Excel (.xlsx), dan PDF**.
- **Acceptance:** Ketiga format terunduh berisi data yang sama dengan tampilan rekap (kolom konsisten); penamaan file jelas (mis. berisi rentang tanggal).
- **US:** #17.
- **Dependensi:** TASK 5.6.

---

## 10. Matriks Pembagian Tugas

> Skema: 4 anggota mengerjakan modul (Auth & Admin dipegang orang yang sama karena overlap domain terbesar — tabel Users/sesi/role), 1 anggota sebagai **Orchestrator** (koordinasi, integrasi, QA, dokumentasi, aset presentasi).

| Anggota | Nama | NIM | Modul | Ringkasan tanggung jawab |
|---|---|---|---|---|
| A |  |  | **2 — Facility & Discovery** | Daftar fasilitas publik, detail & grid slot ketersediaan, pencarian/filter (tipe/lokasi/kapasitas) |
| B |  |  | **3 — Reservation** | Ajukan reservasi (grid slot 30 menit), riwayat, pembatalan pengguna, antrian & proses petugas (approve/reject/cancel), kedaluwarsa, pembatalan massal saat perbaikan |
| C |  |  | **4 — Reporting & Maintenance** | Lapor kerusakan (kategori/deskripsi/foto), status laporan, antrian & proses petugas, tandai fasilitas dalam perbaikan & kembali aktif |
| D |  |  | **1 + 5 — Auth & Admin/Analytics** | Registrasi mandiri, login/logout, guard role; pendaftaran akun petugas/pengguna, verifikasi akun, user & facility management, dashboard rekap & ekspor CSV/Excel/PDF |
| Orchestrator |  |  | **Semua (koordinasi)** | Setup fondasi/DB/seed, integrasi antar-modul, uji end-to-end, pembagian & tracking task, dokumentasi & aset presentasi UTS |

> **Catatan beban:** baris D (Modul 1 + 5) adalah peran paling padat — mulai Auth di Fase 1 agar Modul 5 bisa diselesaikan di Fase 3 dengan data dari modul lain. Jika dirasa berat, pindahkan sebagian TASK 5.4/5.5 ke anggota lain atas kesepakatan tim.

---

## 11. Deliverable Akhir & Checklist

### 11.1 Yang dikumpulkan (satu file Word, Via Kulon, ≤ 11 Okt 2026 12.00 WIB)
- Nama & NIM anggota kelompok (kolom di Matriks diisi).
- **Pembagian tugas** (salin dari Matriks di atas).
- Link file program di Google Drive: source code, file SQL, dan file lain yang dibutuhkan untuk menjalankan program.
- Informasi setting yang diperlukan untuk menjalankan program (env, kredensial DB, langkah migrasi/seed).
- Informasi login untuk masing-masing aktor/pengguna (contoh akun per role dari seed).
- Screenshot antarmuka & penjelasan singkat untuk **masing-masing fitur**.

### 11.2 Checklist presentasi UTS (10 menit + 10–15 menit tanya jawab)
- Latar belakang proyek.
- Fitur utama (demo alur reservasi & laporan end-to-end).
- Demo sistem (siapkan akun contoh per role & data seed).
- Kendala yang dihadapi.

### 11.3 Checklist kualitas (dari ketentuan umum PDF)
- [ ] Authentication: registrasi, login, logout berjalan.
- [ ] Struktur kode terpisah: model (DB), view (tampilan), controller (logika proses).
- [ ] Pembagian folder ada: `/public`, `/app`, `/components`, `/prisma`, `/lib`, `/config` (tanpa `/views` literal — lihat §2.1 & README pemetaan Model/Controller/View).
- [ ] Validasi server **dan** client pada form penting.
- [ ] Validasi slot reservasi (07.00–20.00, kelipatan 30 menit) di **server**.
- [ ] Pencegahan konflik jadwal saat approve.
- [ ] UI/UX mudah digunakan.
- [ ] Semua anggota melakukan commit dengan pesan jelas.
