# Laporan Task 1

## Berkas yang berubah

- `package.json`
- `pnpm-lock.yaml`
- `components.json`
- `lib/utils.ts`
- `vitest.config.mts`
- `vitest.setup.ts`
- `playwright.config.ts`
- `app/globals.css`
- `app/layout.tsx`
- `components/theme-provider.tsx`
- `components/theme-toggle.tsx`
- `components/theme-toggle.test.tsx`
- `tests/baseline-ui.spec.ts`
- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `components/ui/field.tsx`
- `components/ui/card.tsx`
- `components/ui/badge.tsx`
- `components/ui/skeleton.tsx`
- `components/ui/empty.tsx`
- `components/ui/label.tsx`
- `components/ui/separator.tsx`
- `components/ui/sheet.tsx`
- `components/ui/sidebar.tsx`
- `components/ui/tooltip.tsx`
- `hooks/use-mobile.ts`

## Bukti RED

- `pnpm exec playwright test tests/baseline-ui.spec.ts --grep "behavior \(RED\)"` setelah browser tersedia: `PASS (0) FAIL (4)`. Kontrak gagal karena halaman belum memiliki kontrol tema, navigasi desktop, trigger navigasi responsif, dialog drawer, dan `[data-motion-transform]`; rincian aktualnya adalah timeout kontrol tema, navigation/trigger tidak ditemukan, serta locator motion berjumlah 0.
- `pnpm test -- components/theme-toggle.test.tsx` sebelum implementasi: `Failed Suites 1`; gagal resolve `@/components/theme-toggle` karena modul belum ada.

## Bukti GREEN dan verifikasi

- `pnpm test -- components/theme-toggle.test.tsx`: `1` file, `2` test pass.
- `pnpm test`: `1` file, `2` test pass.
- `pnpm lint`: tidak ada masalah.
- `pnpm check:banned`: bersih.
- `pnpm prisma generate`: berhasil.
- `pnpm exec next typegen`: berhasil.
- `pnpm exec tsc --noEmit`: tidak ada error.
- `pnpm build`: berhasil; route statis `/` dan `/_not-found` terbuat.

## Self-review

- Metadata Ruvana dipertahankan persis; root layout kini memakai Poppins, `lang="id"`, `suppressHydrationWarning`, dan provider tema sesuai brief.
- Token semantic, skala primitive, dark mode, focus-visible, selection, dan reduced-motion ditetapkan di `app/globals.css` tanpa media-query tema lama.
- Inventaris komponen hasil CLI sesuai daftar brief. `use-mobile` menggunakan `matchMedia` yang dapat dikendalikan polyfill dan query `(max-width: 1023px)`, tanpa fallback `innerWidth`.
- Perubahan dibatasi pada fondasi Task 1. Tidak ada berkas `.superpowers/` lain yang disentuh.

## Commit

`4c098fc feat: tambahkan fondasi UI Ruvana`

## Concerns

- Kontrak Playwright RED tetap gagal karena shell/sidebar/drawer/motion memang belum termasuk implementasi Task 1; brief secara eksplisit menetapkan kontrak tersebut sebagai RED untuk pekerjaan lanjutan.
- Playwright 1.63 menolak `baseURL` di level konfigurasi teratas, sehingga konfigurasi memakai `use.baseURL` agar valid.
- Vitest 5 memberi peringatan peer dependency karena proyek masih memakai `@types/node` 20, sementara Vitest meminta Node types 22 atau lebih baru; typecheck dan build tetap berhasil.
- Vitest memberi info bahwa `vite-tsconfig-paths` dapat digantikan oleh `resolve.tsconfigPaths`; plugin dipertahankan karena merupakan konfigurasi eksplisit brief.

## Tindak lanjut temuan review

- **HIGH — kontras hover:** menambahkan token semantic `primary-hover` beserta foreground-nya untuk light/dark theme, lalu mengganti hover `primary/80` pada Button dan Badge.
- **HIGH — target aksi sidebar:** `SidebarMenuAction` kini memakai `size-6` (24×24 px pada target aktual desktop), bukan hanya area pseudo-element.
- **HIGH — lokalisasi:** accessible name dan teks pendukung pada Sheet/sidebar diterjemahkan ke bahasa Indonesia: `Tutup`, `Buka navigasi`, `Tutup navigasi`, `Alihkan navigasi utama`, `Navigasi utama`, dan deskripsi navigasi seluler.
- **HIGH — pemisahan internal:** `SidebarProvider` memindahkan state/controller ke `useSidebarController`; `Sidebar` dipecah menjadi `SidebarNonCollapsible`, `SidebarMobile`, dan `SidebarDesktop`. Export publik shadcn tetap sama, termasuk forwarding opsi `collapsible`.
- **MEDIUM — hydration skeleton:** menghapus `Math.random()` dan state lebar acak; lebar teks skeleton sekarang deterministik (`w-3/4`).
- **MEDIUM — ThemeToggle:** menambahkan test RED-first untuk aksi dark→light dan helper `getNextTheme` yang digunakan oleh toggle.
- **MEDIUM/LOW — dependency:** `@types/node` disejajarkan ke `^22`, engines dideklarasikan `node >=22.22.2`, dan `shadcn` dipin tepat ke `4.21.0`; lockfile merekam `@types/node@22.20.2`.

## Bukti RED tambahan

- `pnpm test -- components/theme-toggle.test.tsx components/ui/button-badge.test.tsx components/ui/sidebar.test.tsx` sebelum implementasi: **3 file, 6 test gagal, 2 test lulus**. Kegagalan sesuai temuan: helper ThemeToggle belum ada, token hover belum berubah, target aksi masih 20 px, label masih Inggris, dan skeleton belum deterministik.
- `pnpm test -- components/ui/sidebar.test.tsx` saat forwarding opsi `collapsible` belum diterapkan: **1 test gagal, 8 lulus**; test mengharapkan `data-collapsible="icon"`, tetapi menerima `offcanvas`.

## Verifikasi pascaperbaikan

- `pnpm prisma generate`: **berhasil**.
- `pnpm lint`: **berhasil, tanpa masalah**.
- `pnpm check:banned`: **berhasil, bersih**.
- `pnpm exec next typegen`: **berhasil**.
- `pnpm exec tsc --noEmit`: **berhasil, tanpa error**.
- `pnpm test`: **3 file, 9 test lulus**.
- `pnpm build`: **berhasil**; route statis `/` dan `/_not-found` terbuat.
- `rtk git diff --check`: **berhasil**.
- Vitest masih menampilkan info non-blocking bahwa `vite-tsconfig-paths` dapat digantikan oleh `resolve.tsconfigPaths`.

## Commit perbaikan

`16dc7df perbaiki temuan review UI Task 1`
