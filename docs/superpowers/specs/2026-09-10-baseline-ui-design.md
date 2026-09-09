# Desain baseline UI Ruvana

**Tanggal:** 10 September 2026
**Status:** Disetujui untuk perencanaan implementasi

## Ringkasan

Baseline ini menyediakan fondasi visual, authenticated application shell, navigasi responsif, dan enam primitive inti. `docs/DESIGN.md` tetap menjadi sumber otoritatif; prototype `ruvana-figma-design` hanya menjadi referensi komposisi dan karakter visual.

Route `/` sementara menjadi katalog shell dan primitive. Ia bukan landing publik, dashboard, simulasi autentikasi, atau konten domain.

## Tujuan dan batas

Baseline harus:

- menerapkan token semantik, Poppins, ikon, focus state, dan motion Ruvana;
- menyediakan shell yang menerima navigasi dan identitas dari pemanggil tanpa aturan role;
- menyediakan Button, Field, Card, Badge, Skeleton, dan Empty state;
- memenuhi responsive behavior dan WCAG 2.2 AA;
- dapat diuji tanpa database atau state domain.

Di luar cakupan: landing publik, dashboard, autentikasi, query Prisma, request jaringan, toast, dialog umum, tabel, upload, chart, serta komponen domain. Role-switching demo dari prototype tidak dipindahkan.

## Pendekatan

Gunakan **shadcn berbasis Base UI** untuk fondasi komponen, **Motion** untuk micro-interactions, **Lucide React** untuk ikon, serta Tailwind CSS v4 untuk styling. Token shadcn dipetakan ke token Ruvana agar tidak membentuk palette kedua. Hanya dependency dan komponen yang dibutuhkan baseline yang ditambahkan.

## Arsitektur

### Fondasi global

`globals.css` mendefinisikan warna, status, typography, spacing, radius, shadow, focus ring, durasi, dan easing sebagai token semantik dari `DESIGN.md`. Komponen tidak mengulang raw color bila token semantik tersedia.

Root layout memuat Poppins melalui integrasi font Next.js, menetapkan `lang="id"`, dan mempertahankan metadata Ruvana. Global styles juga menyediakan canvas, selection, focus-visible, dan reduced-motion defaults.

### Primitive UI

Primitive hasil integrasi shadcn ditempatkan di `components/ui/`. Primitive hanya menerima content dan presentational state melalui props; ia tidak membaca sesi, role, database, atau status domain.

### Application shell

`components/app-shell/` mengomposisikan `AppShell`, sidebar desktop, mobile app bar, dan mobile navigation drawer. `AppShell` menerima:

- `navigation`: daftar key, label, href, dan ikon Lucide;
- `account`: nama tampilan dan label peran untuk presentasi;
- `onLogout` atau logout destination yang dimiliki pemanggil;
- `children`: content outlet.

Server Component pada modul autentikasi kelak menjadi pemilik sesi dan hanya mengirim menu yang diizinkan. Shell tidak menentukan role, memfilter izin, atau menyembunyikan menu dengan CSS. Data pada katalog `/` diberi label **Pratinjau UI** agar tidak menyerupai sesi production.

## Shell dan navigasi

- **Desktop, `>=1024px`:** sidebar gelap selebar 232–256 px, identitas Ruvana di atas, menu vertikal, akun dan logout di bawah, serta outlet fleksibel.
- **Tablet, `768–1023px`:** app bar dengan navigasi yang dapat dibuka sebagai drawer; ruang konten tetap satu atau dua kolom sesuai konsumennya.
- **Mobile, `<768px`:** app bar dan drawer satu kolom tanpa horizontal overflow.

Item navigasi memiliki target minimal 44×44 px, ikon, label Indonesia, hover, focus-visible, dan active cue yang tidak bergantung pada warna. Active state berasal dari pathname. Drawer berbasis shadcn/Base UI harus menjebak fokus, membuat latar inert, mendukung Escape, menutup setelah navigasi, dan mengembalikan fokus ke pemicu.

## Core primitives

- **Button:** primary, secondary, outline, ghost, danger; slot ikon; loading mempertahankan ukuran dan mencegah aksi ganda; disabled tetap terbaca.
- **Field:** label wajib, control, help text, required indicator, dan error; seluruh deskripsi terhubung secara programatis dan invalid state tidak hanya memakai warna.
- **Card:** header, content, footer opsional; surface, border, radius, spacing, dan shadow dari token; tidak interaktif secara default.
- **Badge:** pending, success, danger, info, neutral; memakai pasangan token status dan selalu menyertakan teks.
- **Skeleton:** menjaga bentuk konten, tidak diumumkan sebagai konten nyata, dan animasinya berhenti pada reduced motion.
- **Empty state:** ikon opsional, judul, deskripsi, dan action opsional yang mengomposisikan Button.

## Ikon dan motion

Lucide React menjadi keluarga ikon default. Ukuran umum 16–20 px dengan stroke konsisten. Icon-only control wajib memiliki accessible name dan target 44×44 px; ikon dekoratif memakai `aria-hidden`. Status dan error selalu disertai teks. Ikon custom hanya dipakai jika Lucide tidak memiliki simbol yang tepat dan harus mengikuti gaya outline Lucide.

Motion dibatasi pada transisi drawer, perpindahan active navigation indicator, dan fade/translate ringan katalog. Hover sederhana tetap memakai CSS. Durasi dan easing menggunakan token terpusat. `prefers-reduced-motion` menonaktifkan transform dan informasi tidak boleh bergantung pada animasi.

## Data dan state

Route `/` memasok navigation, account, dan contoh state primitive yang statis serta jelas berlabel pratinjau. `AppShell` meneruskannya ke sidebar dan drawer. Satu-satunya client state adalah interaksi presentasional seperti drawer terbuka. Tidak ada Prisma, network request, role state, atau data fasilitas/reservasi/laporan.

Field menampilkan error dekat control, Button mencegah aksi ganda, dan Empty state dapat menawarkan pemulihan. Karena baseline tidak memiliki request atau mutasi, toast, retry, network error, dan success flow ditunda hingga fitur yang memilikinya.

## Pengujian

Gunakan Vitest, Testing Library, user-event, jest-dom, integrasi axe-core, dan Playwright. Implementasi mengikuti RED–GREEN–REFACTOR per irisan.

Behavior tests mencakup:

- state dan varian Button;
- hubungan label, bantuan, required state, dan error pada Field;
- struktur Card, Badge, Skeleton, dan Empty state;
- active navigation;
- drawer dengan pointer dan keyboard, focus trap, Escape, serta focus return;
- reduced motion;
- axe check pada shell dan katalog.

Playwright memeriksa viewport mobile, tablet, dan desktop; horizontal overflow; serta visual regression minimum untuk katalog desktop dan mobile drawer terbuka. Hindari snapshot DOM besar. Verifikasi akhir mengikuti urutan proyek: Prisma generate, lint, banned-word check, Next typegen, TypeScript, test, visual checks, lalu production build.

## Kriteria penerimaan

- Token, Poppins, `lang="id"`, spacing, radius, shadow, focus, status, dan motion sesuai `DESIGN.md`.
- Desktop sidebar, tablet/mobile app bar, dan drawer bekerja pada breakpoint yang ditetapkan.
- Shell menerima data melalui interface presentasional dan tidak mengandung business role rules.
- Core 6 tersedia sebagai komponen shadcn/Base UI bergaya Ruvana.
- Lucide adalah keluarga ikon default dan aturan aksesibilitas ikon dipenuhi.
- Motion terbatas pada micro-interactions yang disepakati serta mendukung reduced motion.
- `/` menampilkan katalog berlabel pratinjau tanpa database atau business content.
- Behavior, accessibility, responsive, visual, lint, typecheck, dan build checks lulus.

## Keputusan yang ditunda

Landing publik, integrasi sesi server, menu final per role, API komponen domain, overlay umum, dan dokumentasi design system terpisah ditentukan dalam siklus desain modul masing-masing.
