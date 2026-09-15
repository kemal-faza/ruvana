# Ruvana Design Contract

## Tujuan dan otoritas

Dokumen ini adalah kontrak desain permanen Ruvana untuk desainer, pengembang, dan agen AI. Dokumen ini menetapkan bahasa visual, interaksi, aksesibilitas, dan konten tanpa menggantikan kebijakan bisnis dalam PRD.

Urutan otoritas saat sumber bertentangan:

1. **PRD final** — kebijakan bisnis dan perilaku domain.
2. **`DESIGN.md`** — keputusan visual, interaksi, aksesibilitas, dan konten.
3. **Requirements pendukung** — memperjelas kebutuhan yang belum tercakup.
4. **Code proyek** — detail teknis yang mengikuti sumber di atas.
5. **Prototype UI** — referensi visual dan interaksi yang opsional serta nonnormatif.

Ringkas: **PRD → DESIGN → requirements → code → prototype**.

Otoritas runtime: keputusan peran, kepemilikan, otorisasi, konflik, dan state domain berasal dari server; UI hanya mencerminkan hasilnya.

## Prinsip desain

- **Hangat:** gunakan ivory, permukaan putih, dan aksen alami; hindari kesan steril.
- **Tenang:** jaga hierarki, ruang, dan animasi tetap terukur.
- **Mudah didekati:** bahasa langsung dan pola yang dapat diprediksi harus membantu pengguna menyelesaikan tugas.
- **Tepercaya:** tampilkan status, dampak, dan kesalahan secara jujur; jangan menyembunyikan konsekuensi.
- **Jelas:** setiap halaman memiliki tujuan, aksi utama, dan konteks yang mudah dipindai.
- **Terkendali:** hindari dekorasi, gradasi kuat, dan variasi komponen yang tidak memiliki alasan.

## Fondasi

Gunakan token semantik, bukan nilai mentah yang tersebar di komponen.

### Warna

| Token semantik | Nilai | Penggunaan |
|---|---|---|
| `color-canvas` | `#F7F5EF` | Latar utama yang hangat |
| `color-surface` | `#FFFFFF` | Kartu dan permukaan utama |
| `color-action-brand` | `#6F7F3B` | Fondasi merek dan aksen olive; bukan token teks atau fokus |
| `color-action-strong` | `#526222` | Aksi interaktif dengan teks putih; pilih kontras minimal 4.5:1 |
| `color-accent-gold` | `#D9A441` | Aksen pendukung |
| `color-highlight-orange` | `#E89B45` | Highlight terbatas, bukan default kontrol |
| `color-text` | `#252525` | Teks utama |
| `color-text-muted-brand` | `#77746D` | Fondasi brand; bukan default teks metadata |
| `color-text-muted` | `#5F5D57` | Teks sekunder dan metadata 12 px di atas ivory |
| `color-border` | `#E5E2D9` | Batas dekoratif atau pemisah; bukan satu-satunya batas kontrol |
| `color-border-strong` | `#526222` | Batas kontrol bermakna; minimal 3:1 terhadap permukaan |
| `color-focus-ring` | `#526222` | Indikator fokus; minimal 3:1 terhadap permukaan |
| `color-subtle` | `#F1F0EA` | Latar sekunder |
| `color-shell-dark` | `#1A1E14` | Pengecualian untuk shell navigasi gelap |

`color-action-brand` tetap menjadi fondasi merek. Jika teks tombol di atasnya tidak mencapai WCAG 2.2 AA, gunakan `color-action-strong` untuk interaksi; jangan menurunkan standar kontras.

`color-text-muted-brand` dipertahankan sebagai fondasi brand; gunakan `color-text-muted` untuk metadata normal-size, termasuk 12 px, agar tetap terbaca.

Nilai palette mentah tidak boleh dipakai langsung untuk teks, tautan, indikator fokus, penanda chart bermakna, atau satu-satunya batas kontrol. Target WCAG 2.2 AA: minimal 4.5:1 untuk teks normal, 3:1 untuk teks besar dan UI nonteks atau indikator fokus; gunakan token semantik yang sesuai.

### Token status semantik

Setiap pasangan teks dan permukaan berikut harus dipakai bersama; rasionya memenuhi minimal 4.5:1 untuk teks normal.

| Makna | Token teks | Token permukaan | Pemetaan warna |
|---|---|---|---|
| Pending / warning | `color-status-pending-text` | `color-status-pending-surface` | `#6B4700` pada `#FFF3D6` |
| Success | `color-status-success-text` | `color-status-success-surface` | `#1F5C3A` pada `#E7F4EC` |
| Error / danger | `color-status-danger-text` | `color-status-danger-surface` | `#9B1C1C` pada `#FDECEC` |
| Info / in-progress | `color-status-info-text` | `color-status-info-surface` | `#075985` pada `#E0F2FE` |
| Neutral | `color-status-neutral-text` | `color-status-neutral-surface` | `#4A4A46` pada `#F1F0EA` |

Aturan otoritatif status: setiap status harus memiliki teks atau ikon selain warna. Komponen lain cukup merujuk aturan ini.

### Tipografi

| Token | Nilai |
|---|---|
| `font-family-display` dan `font-family-body` | Poppins |
| `font-weight-regular` / `medium` / `semibold` / `bold` | 400 / 500 / 600 / 700 |
| `type-page-heading` | 20–22 px, umumnya 600 |
| `type-body-control` | 13–16 px |
| `type-metadata` | Minimal 12 px, tetap terbaca |

Gunakan 700 hanya untuk metrik atau display yang benar-benar perlu penekanan. Judul umum sebaiknya 600.

### Spasi, radius, elevation, ikon, dan motion

| Kelompok | Token dan aturan |
|---|---|
| Spasi | `space-page` 28–32 px desktop; `space-card` 18–24 px; gap berulang 8–24 px |
| Radius | `radius-card` 16–24 px; `radius-control` 8–12 px |
| Bayangan | `shadow-subtle: 0 2px 8px rgba(0,0,0,0.04)`; gunakan untuk menunjukkan kedalaman |
| Ikon | Satu keluarga outline konsisten, seperti Lucide, umumnya 16–20 px |
| Motion | Singkat, tenang, dan informatif |

Gradasi kuat tidak boleh digunakan. Gradasi tonal halus hanya boleh muncul pada satu area highlight noninteraktif, bukan sebagai treatment kontrol.

## Tata letak dan navigasi

### Breakpoint

| Lebar viewport | Struktur dan perilaku |
|---|---|
| `<768 px` | App bar, navigation drawer, dan konten satu kolom |
| `768–1023 px` | Navigasi dapat diciutkan; grid satu atau dua kolom |
| `≥1024 px` | Sidebar penuh dan layout multi-kolom |

### Shell dan komposisi

- Halaman publik memakai header horizontal sederhana untuk **Beranda**, **Fasilitas**, **Jadwal**, **Masuk**, dan **Daftar**.
- Halaman terautentikasi memakai sidebar desktop selebar 232–256 px, area konten fleksibel, dan page header.
- Susunan halaman: judul dan deskripsi → aksi utama → filter atau ringkasan → konten utama.
- Drawer dipakai untuk detail kontekstual cepat; dialog untuk konfirmasi atau tugas singkat; alur panjang memakai halaman khusus.
- Tabel kompleks menyembunyikan kolom sekunder atau berubah menjadi kartu ringkasan di mobile. Jangan membuat horizontal scroll seluruh halaman; scroll lokal tabel hanya dipakai jika relasi tabular penting tidak dapat dipertahankan.

### Matriks peran

| Peran | Tujuan dan navigasi yang tersedia |
|---|---|
| Pengunjung | Menemukan fasilitas dan jadwal publik; lihat aturan privasi publik di **Desain konten** |
| Pengguna | Dashboard, Fasilitas, Reservasi Saya, Laporan Saya |
| Petugas | Dashboard, Persetujuan Reservasi, Laporan Kerusakan, status operasional fasilitas sesuai kewenangan |
| Admin | Dashboard, Verifikasi Akun, Pengguna, Fasilitas, Analitik, Ekspor |

Destinasi yang tidak tersedia harus dihilangkan dari navigasi. Akses mengikuti aturan otoritas server di **Tujuan dan otoritas**. Navigasi aktif, judul halaman, dan breadcrumb harus menunjukkan lokasi; identitas akun dan logout harus konsisten di menu profil atau footer sidebar.

## Komponen

Setiap komponen yang relevan harus mendefinisikan keadaan default, hover, focus-visible, loading, disabled, success, error, dan empty.

### Matriks state

| Komponen | Default dan interaksi | Loading / disabled | Success / error / empty |
|---|---|---|---|
| Tombol | Primary, secondary, outline, ghost, danger; hover dan focus-visible; label menyatakan aksi | Ukuran tetap, cegah submit ganda | Hasil aksi dijelaskan di konten |
| Field | Label, help, required, focus | Disabled tetap terbaca | Error di dekat field; success bila relevan |
| Card | Putih, border lembut, padding konsisten, elevation tertahan | Skeleton bila memuat data | Empty state menjelaskan langkah berikutnya |
| Badge | Pasangan token status di **Fondasi**; label menyatakan makna | Tidak berlaku | Ikuti aturan status otoritatif di **Fondasi** |
| Tabel / list | Responsif; search, filter, sorting, pagination bila relevan | Skeleton atau disabled control | Error dapat dicoba ulang; empty menjelaskan kondisi |
| Dialog | Fokus terperangkap; destructive action menyebut objek dan konsekuensi | Action loading mencegah duplikasi | Error dapat dipulihkan; success memperbarui konteks |
| Drawer | Detail kontekstual; fokus dikelola; latar belakang inert | Loading mempertahankan struktur | Error dan empty tetap memiliki konteks |
| Toast | Ringkas, tidak mengganggu tugas | Tidak berlaku | Bukan satu-satunya bukti success; error menawarkan pemulihan |
| Upload | Format dan batasan jelas; progress terlihat | Disabled selama proses yang tidak boleh digandakan | Success/error dan retry |
| Kartu fasilitas | Identitas, tipe, lokasi, kapasitas, status, fasilitas pendukung, akses jadwal | Skeleton kartu | Empty/error tetap menjelaskan fasilitas atau pemulihan |
| Pemilih slot | Tersedia, Dipilih, Tidak tersedia; kontrol dinonaktifkan; pilihan berurutan | Dinonaktifkan saat data disegarkan | Konflik mengikuti alur pemulihan di bagian Alur utama |
| Ringkasan reservasi | Fasilitas, tanggal, rentang waktu, status, aksi yang relevan | Skeleton atau action loading | Status dan error dapat dipindai |
| Ringkasan laporan | Fasilitas, kategori, waktu, status, foto, catatan bila ada | Skeleton atau action loading | Empty/error memiliki langkah berikutnya |
| Visualisasi data | Nilai utama, label, periode, konteks, alternatif teks | Skeleton mempertahankan struktur | Empty/error menyediakan ringkasan teks |

State yang tidak ditulis pada baris komponen domain mewarisi perilaku yang berlaku dari shared primitive terkait; state yang benar-benar tidak relevan ditulis sebagai **Tidak berlaku**.
Istilah **available**, **selected**, **loading**, **success**, **error**, **empty**, **skeleton**, dan **signed URL** hanya nama state atau istilah teknis implementasi, bukan copy literal untuk pengguna; state slot yang terlihat memakai **Tersedia**, **Dipilih**, dan **Tidak tersedia**.

## Alur utama

### 1. Verifikasi akun

1. Pengunjung mendaftar dan menerima status **Menunggu Verifikasi**.
2. Sistem menolak akses masuk sampai akun disetujui.
3. Admin meninjau data, lalu menyetujui atau menolak dengan status dan umpan balik yang jelas.
4. Setiap perubahan menampilkan keadaan menunggu, berhasil, atau gagal yang dapat dipulihkan.

### 2. Reservasi

1. Pengguna memilih fasilitas, tanggal, satu atau lebih interval berurutan, lalu memasukkan tujuan.
2. Slot terdiri dari 26 interval setengah jam, mulai **07.00–07.30** dan berakhir **19.30–20.00**.
3. Pengguna meninjau ringkasan dan mengirim permintaan; status awalnya **Menunggu**.
4. Hanya reservasi **Disetujui** yang memblokir ketersediaan publik. Permintaan menunggu boleh bertumpang tindih.
5. Persetujuan menjalankan pemeriksaan konflik otoritatif di server.

### 3. Konflik persetujuan

1. Jika ketersediaan berubah saat persetujuan, jelaskan penyebab konflik.
2. Segarkan slot, pertahankan input yang tidak terdampak, dan minta petugas memilih ulang.
3. Jangan menyelesaikan konflik hanya dari state klien.

### 4. Pembatalan

1. Pengguna hanya dapat membatalkan reservasi miliknya sendiri yang berstatus **Menunggu** atau **Disetujui**, sesuai aturan **H−24** dari waktu mulai, dan harus menyertakan alasan.
2. Petugas yang menolak atau membatalkan harus memasukkan alasan.
3. Reservasi menunggu yang melewati waktu penggunaan menjadi **Kedaluwarsa**.

### 5. Pelaporan kerusakan

1. Pengguna memilih fasilitas dan kategori, menulis deskripsi, lalu mengunggah foto wajib.
2. Buat laporan hanya setelah upload berhasil; kegagalan upload tidak boleh membuat data laporan parsial.
3. Foto tetap privat. Server hanya menerbitkan signed read URL berumur pendek setelah memverifikasi sesi terautentikasi dan kepemilikan atau peran **Petugas/Admin**; jangan pernah mengekspos raw storage path ke publik.
4. Penyelesaian atau penolakan harus memiliki catatan penjelasan.

### 6. Pemeliharaan fasilitas

1. Fasilitas **Dalam Perbaikan** atau **Nonaktif** tidak menerima reservasi baru.
2. Sebelum konfirmasi, tampilkan dampak perubahan kepada petugas.
3. Saat transisi pemeliharaan terjadi, batalkan otomatis hanya reservasi **Disetujui** dengan waktu mulai setelah waktu transisi.
4. State terlihat menjadi **Dibatalkan Petugas**, dengan alasan otomatis pemeliharaan dan notifikasi jelas kepada pengguna.

### 7. Administrasi

1. Admin mengelola verifikasi akun, pengguna, fasilitas, analitik, dan ekspor sesuai kewenangan.
2. Terapkan validasi peran, kepemilikan, konflik, dan state sesuai otoritas server di **Tujuan dan otoritas**.
3. UI hanya menjelaskan hasil keputusan dan menyediakan pemulihan yang relevan.

## Umpan balik dan kesalahan

Setiap error harus menyatakan apa yang terjadi dan cara memulihkannya dengan bahasa yang tidak menyalahkan pengguna.

| Situasi | Respons yang harus diberikan |
|---|---|
| Loading awal | Skeleton menyerupai konten akhir |
| Loading aksi | Pertahankan ukuran kontrol, tampilkan label atau indikator proses, cegah submit ganda |
| Empty | Jelaskan penyebab dan tawarkan aksi berikutnya bila ada |
| Validation | Tampilkan di dekat field; untuk banyak error, beri ringkasan dan fokus ke field invalid pertama |
| Conflict | Jelaskan penyebab dan tawarkan aksi spesifik, seperti menyegarkan slot |
| Unexpected failure | Sembunyikan detail internal, pertahankan input yang aman, sediakan retry |
| Destructive action | Minta konfirmasi dengan nama objek dan konsekuensinya |
| Success | Refleksikan pada konten yang diperbarui; toast hanya sebagai penguat |

## Aksesibilitas

Target produk adalah **WCAG 2.2 AA**.

- [ ] Semua fungsi bekerja dengan keyboard, urutan fokus logis, dan indikator focus-visible yang jelas.
- [ ] Gunakan landmark yang benar dan heading berurutan.
- [ ] Setiap input memiliki label terprogram; kontrol icon-only memiliki accessible name.
- [ ] Status mengikuti aturan nonwarna di **Fondasi**; error, chart, dan state slot juga menyediakan cue nonwarna berupa teks, pola, label, bentuk, atau ikon.
- [ ] Perubahan asinkron yang relevan diumumkan melalui live region.
- [ ] Dialog menjebak fokus; drawer mobile mengelola fokus dan membuat latar belakang inert.
- [ ] Motion menghormati `prefers-reduced-motion`; ini adalah aturan aksesibilitas otoritatif.
- [ ] Target sentuh minimal 44 × 44 px.
- [ ] Root dokumen menetapkan `lang="id"`.

## Desain konten

- Gunakan bahasa Indonesia yang ringkas, langsung, dan tidak menyalahkan pengguna.
- Gunakan **Anda** untuk tindakan formal atau administratif dan kalimat netral untuk instruksi umum; jangan mencampur “kamu”, “Anda”, dan istilah Inggris yang tidak perlu.
- Gunakan sentence case untuk judul.
- Label aksi harus konkret: **Ajukan reservasi**, **Setujui**, **Unggah foto**.
- Enum teknis tetap di data layer; antarmuka memakai kosakata berikut:

| Domain | Label status |
|---|---|
| Reservasi | Menunggu, Disetujui, Ditolak, Dibatalkan Pengguna, Dibatalkan Petugas, Kedaluwarsa |
| Laporan | Baru, Diproses, Selesai, Ditolak |
| Fasilitas | Aktif, Dalam Perbaikan, Nonaktif |
| Akun | Menunggu Verifikasi, Aktif, Ditolak, Dinonaktifkan |

- Privasi publik: konten publik tidak boleh mengungkap identitas pemilik reservasi atau tujuan reservasi.
- Tampilkan tanggal dan waktu dalam bahasa Indonesia pada zona waktu **Asia/Jakarta**; simpan timestamp otoritatif dalam UTC.
- Hindari bahasa Inggris yang tidak diperlukan dalam label, status, bantuan, dan pesan kesalahan.

## Visualisasi data

- Beri ringkasan tertulis yang mudah dipahami sebelum atau di samping chart.
- Sertakan label, legenda, tooltip, unit, periode, dan alternatif teks atau tabel.
- Gunakan token visualisasi semantik dengan kontras memadai; status merujuk aturan otoritatif di **Fondasi**.
- Hindari chart 3D, dekorasi berlebih, dan warna status untuk kategori yang tidak berkaitan dengan status.
- Ekspor CSV, XLSX, dan PDF harus mempertahankan istilah yang terlihat, filter, rentang tanggal, serta interpretasi zona waktu.

## Checklist implementasi

- [ ] Nilai visual memakai semantic design tokens.
- [ ] Shared primitives memiliki behavior dan state umum; komponen domain mengomposisikannya tanpa duplikasi.
- [ ] Akses data dan state mengikuti otoritas server di **Tujuan dan otoritas**.
- [ ] Default, loading, disabled, error, success, empty, keyboard, dan responsive behavior didefinisikan untuk komponen yang relevan.
- [ ] Layout diuji pada mobile, tablet, dan desktop.
- [ ] Behavior tests mencakup state utama.
- [ ] Domain tests mencakup konflik slot, aturan H−24, foto wajib, kepemilikan, dan penegakan peran.
- [ ] Keyboard dan automated accessibility checks dijalankan.
- [ ] Visual regression mencakup primitives dan layar kunci.
- [ ] End-to-end journey mencakup pendaftaran-verifikasi, reservasi-persetujuan, pelaporan-penyelesaian, dan perubahan status fasilitas.
- [ ] Terapkan YAGNI (*You Aren't Gonna Need It*): jangan menambah varian visual atau abstraksi sebelum kebutuhan terbukti.

## Referensi prototipe

Prototype bersifat **opsional, nonnormatif, dan tidak diperlukan** agar kontrak ini dapat digunakan.

1. Gunakan lokasi prototype yang diberikan maintainer bila konteks visual tambahan memang diperlukan.
2. Jika tidak diberikan, cari kandidat hanya di workspace atau direktori terdekat yang dapat diakses.
3. Verifikasi kandidat melalui beberapa sinyal: layar **Ruvana Dashboard**, **Fasilitas**, **Reservasi**, dan **Laporan**, tipografi Poppins, serta warna fondasi `#F7F5EF`.
4. Jika ada beberapa kandidat atau identitasnya tetap tidak pasti, tanyakan kepada maintainer; jangan menebak proyek yang berwenang.
5. Jika prototype bertentangan dengan PRD atau kontrak ini, sumber yang lebih tinggi dalam **Tujuan dan otoritas** selalu menang.

## Landing page publik

- `/` memperkenalkan Ruvana dengan fokus reservasi dan pelaporan kerusakan sebagai manfaat pendukung.
- Urutan konten: hero → manfaat utama → cara kerja → ajakan menjelajahi fasilitas → footer.
- CTA utama “Jelajahi Fasilitas” menuju `/fasilitas`; tujuan ini disiapkan untuk integrasi fitur fasilitas yang dikembangkan terpisah.
- Hero memakai ilustrasi antarmuka fasilitas dan jadwal, dengan penanda bahwa informasi bukan ketersediaan aktual.
- Konten menjelaskan bahwa pengajuan membutuhkan akun terverifikasi dan persetujuan petugas.
- Header publik, token visual yang sama, serta tema sistem dengan pengalih terang/gelap digunakan pada landing page.
- Header publik memakai wordmark teks **ruvana** tanpa ikon, aksi **Jelajahi Fasilitas** yang sama dengan hero di samping pengalih tema, dan navigasi Beranda, Fasilitas, serta Cara kerja.
- Landing page memakai motion singkat: hero muncul saat halaman dimuat, bagian berikutnya muncul saat masuk viewport, dan setiap animasi menghormati `prefers-reduced-motion`.
- Katalog komponen dipertahankan sementara di `/baseline-ui` sebagai referensi pengembangan.
