# Patch dependency (pnpm)

## next-themes@0.4.6 — ThemeScript hanya SSR

**Berkas:** `next-themes@0.4.6.patch`, dipakai lewat `patchedDependencies` di `pnpm-workspace.yaml`.

**Masalah.** next-themes 0.4.6 merender `<script>` no-flash di dalam `ThemeProvider`.
Di React 19.2, script yang dibuat saat render client memunculkan error dev
"Encountered a script tag while rendering React component". Script itu hanya perlu
ada di HTML SSR untuk mencegah kedip tema; setelah hydration ia tidak berguna.

**Perbaikan.** Patch menambal `dist/index.js` dan `dist/index.mjs`: `ThemeScript`
mengembalikan `null` saat berjalan di client (`typeof window !== "undefined"`),
sehingga hanya dirender saat SSR.

**Status upstream.** next-themes 0.4.6 adalah versi terbaru dan belum memuat
perbaikan ini.
- Issue: https://github.com/pacocoursey/next-themes/issues/397
- PR: https://github.com/pacocoursey/next-themes/pull/386

**Hapus patch ini** setelah upstream merilis perbaikan (atau saat repo punya e2e
yang menjaga perilaku tema).

**Verifikasi manual (sebelum rilis; repo belum punya e2e browser):**
1. Hard refresh di mode terang dan gelap: tidak ada kedip tema (FOUC).
2. Tema tersimpan tetap dipakai setelah reload.
3. Console bersih: tanpa warning hydration maupun "Encountered a script tag".
4. Toggle terang → gelap → sistem tetap berfungsi.

**Catatan.** Patch menyentuh berkas build pihak ketiga (minified) dan dipin ke
`0.4.6` persis; tinjau ulang saat menaikkan versi next-themes.
