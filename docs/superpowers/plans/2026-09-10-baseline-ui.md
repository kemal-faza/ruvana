# Baseline UI Ruvana Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended), executing-plans, or dispatching-parallel-agents (for independent wave tasks) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun fondasi visual light/dark, enam primitive UI, serta shell Ruvana dengan sidebar desktop dan drawer tablet/mobile yang aksesibel.

**Architecture:** Tailwind v4 mengekspos lima primitive color scale OKLCH melalui semantic tokens yang juga menjadi compatibility layer shadcn. Primitive shadcn berbasis Base UI tetap presentasional, sedangkan `AppShell` menerima navigation/account/logout/children dari pemanggil dan membatasi client state pada tema, pathname, serta drawer. Route `/` hanya mengomposisikan katalog statis berlabel pratinjau.

**Tech Stack:** Next.js 16.3.4 App Router, React 19.2.8, Tailwind CSS v4, shadcn/Base UI, Motion, Lucide React, next-themes, Vitest, Testing Library, jest-dom, vitest-axe, dan Playwright.

## Global Constraints

- Gunakan pnpm `10.30.2`; pertahankan Next.js `16.3.4`, React/React DOM `19.2.8`, dan TypeScript strict.
- Baca panduan terkait di `node_modules/next/dist/docs/` sebelum mengubah API Next.js; untuk task ini panduan font dan testing sudah diidentifikasi.
- Gunakan shadcn dengan **Base UI**, bukan Radix UI; gunakan CSS variables dan pinned `base-nova` preset.
- Primitive warna hanya `primary`, warm `neutral`, `green`, `red`, dan `yellow`; semantic status mengalias tiga intent scale dan shadcn `secondary`/`accent` mengalias neutral.
- Gunakan semantic color utilities pada komponen; primitive scale hanya untuk mendefinisikan semantic mappings atau kebutuhan visual yang tidak memiliki makna semantic.
- Target WCAG 2.2 AA, target sentuh minimal 44×44 px, focus-visible jelas, status tidak bergantung pada warna, dan seluruh copy user-facing berbahasa Indonesia.
- Poppins adalah font default; Lucide React satu-satunya keluarga ikon default; Motion hanya untuk drawer, active indicator, dan entrance katalog serta wajib menghormati reduced motion.
- Desktop dimulai pada `1024px`; sidebar 232–256 px dan tidak pernah menjadi icon rail. Tablet 768–1023 px dan mobile <768 px memakai app bar plus drawer.
- Jangan tambahkan Prisma query, autentikasi, role filtering, network request, landing publik, toast, chart, tabel, upload, atau komponen domain.
- Ikuti RED–GREEN–REFACTOR; setiap implementasi behavior didahului test yang diamati gagal.
- Jangan stage direktori lokal `.superpowers/`.
- **Review workflow commit:** setelah koreksi review ini selesai dan sebelum implementasi dimulai, commit file plan ini sendiri dengan `git add -f docs/superpowers/plans/2026-09-10-baseline-ui.md && git commit -m "docs: tetapkan rencana baseline UI"`. Jangan memasukkan `docs/superpowers/specs/` atau file plan ini ke commit implementasi berikutnya; keduanya sudah menjadi artefak review yang committed.

## File Structure

**Create/configure**

- `components.json` — konfigurasi CLI shadcn untuk Base UI, Tailwind v4, RSC, dan alias proyek.
- `lib/utils.ts` — helper `cn` yang dibuat shadcn.
- `vitest.config.mts`, `vitest.setup.ts` — lingkungan unit/component test jsdom.
- `playwright.config.ts` — browser projects dan web server untuk E2E/visual test.
- `components/theme-provider.tsx` — adapter `next-themes`.
- `components/theme-toggle.tsx` — kontrol tema light/dark yang hydration-safe.
- `components/ui/{button,input,field,card,badge,skeleton,empty,label,separator,sheet,sidebar,tooltip}.tsx` — primitive shadcn/Base UI dan seluruh dependency lokal yang dihasilkan oleh perintah CLI pinned.
- `hooks/use-mobile.ts` — breakpoint drawer `<1024px` yang dipakai sidebar.
- `components/app-shell/types.ts` — kontrak navigation/account/logout.
- `components/app-shell/app-sidebar.tsx` — brand, grouped navigation, active state, account, logout.
- `components/app-shell/mobile-app-bar.tsx` — brand, drawer trigger, dan theme toggle.
- `components/app-shell/app-shell.tsx` — komposisi responsive shell dan content outlet.
- `components/ui/*.test.tsx`, `components/theme-toggle.test.tsx`, `components/app-shell/*.test.tsx` — behavior dan axe coverage terkolokasi.
- `tests/baseline-ui.spec.ts` — behavior RED contracts dibuat sebelum implementasi; visual assertions ditambahkan pada Task 6.

**Modify**

- `package.json`, `pnpm-lock.yaml` — dependencies dan scripts test.
- `app/globals.css` — token, light/dark mappings, typography, focus, selection, motion.
- `app/layout.tsx` — Poppins, `lang="id"`, dan ThemeProvider.
- `app/page.tsx` — katalog static Core 6 di dalam shell.

**Delete**

- `components/placeholder.tsx` — placeholder Fase-0 tidak lagi memiliki caller setelah katalog menggantikannya.

## Interfaces Locked for All Tasks

```tsx
import type { LucideIcon } from "lucide-react"

export interface NavigationItem {
  key: string
  label: string
  href: string
  icon: LucideIcon
}

export interface NavigationGroup {
  key: string
  label: string
  items: readonly NavigationItem[]
}

export interface ShellAccount {
  displayName: string
  roleLabel: string
}

export interface AppShellProps {
  navigation: readonly NavigationGroup[]
  account: ShellAccount
  logoutDestination: string
  children: React.ReactNode
}
```

`logoutDestination` adalah kontrak destination-page yang aman: pemanggil server hanya memasok path halaman internal same-origin (contoh `"/keluar"`), lalu shell merender ordinary Next `Link` berlabel `Keluar`. Nilai ini bukan endpoint mutasi, bukan Server Action, bukan callback, dan tidak boleh mengubah sesi melalui GET. Integrasi sesi di masa depan hanya boleh mengganti link ini dengan `<form method="post" action={serverAction}>` yang memanggil POST Server Action; mutasi sesi tidak boleh disisipkan ke dalam `logoutDestination`. Shell tetap tidak mengeksekusi business logic.

## Execution Order

- **Wave 1 (sequential foundation):** Task 1 — dependency, test harness, browser behavior RED contracts, shadcn/Base UI, tokens, font, dan theme provider.
- **Wave 2 (parallel):** Task 2 dan Task 3 — primitive files berbeda dan hanya bergantung pada foundation Task 1.
- **Wave 3 (sequential):** Task 4 — shell bergantung pada primitive dan theme controls Tasks 1–3.
- **Wave 4 (sequential):** Task 5 — katalog mengomposisikan seluruh public contract.
- **Wave 5 (sequential):** Task 6 — browser/accessibility/visual verification dan pemeriksaan proyek penuh.

---

### Task 1: Fondasi shadcn, test, token, font, dan tema

**Files:**
- Create: `components.json`
- Create: `lib/utils.ts`
- Create: `vitest.config.mts`
- Create: `vitest.setup.ts`
- Create: `playwright.config.ts`
- Create: `tests/baseline-ui.spec.ts`
- Create: `components/theme-provider.tsx`
- Create: `components/theme-toggle.tsx`
- Test: `components/theme-toggle.test.tsx`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: existing `@/*` alias from `tsconfig.json`; Next.js `Poppins`; approved semantic-token contract.
- Produces: `cn(...inputs)`, `ThemeProvider`, `ThemeToggle`, Tailwind semantic utilities, and Vitest scripts/configuration.

**Blocked by:** None — can start immediately.

- [ ] **Step 1: Install the test harness before product dependencies**

Run:

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom vitest-axe vite-tsconfig-paths @playwright/test @axe-core/playwright
```

Add scripts to `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

Create `vitest.config.mts`:

```ts
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: true,
  },
})
```

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest"

const mediaState = new Map<string, boolean>()
const mediaLists = new Map<string, Set<MediaQueryList>>()
const mediaListeners = new Map<string, Set<(event: MediaQueryListEvent) => void>>()

export function setMatchMedia(query: string, matches: boolean) {
  mediaState.set(query, matches)
  mediaLists.get(query)?.forEach((mediaList) => {
    Object.defineProperty(mediaList, "matches", { configurable: true, value: matches })
  })
  const event = { matches, media: query } as MediaQueryListEvent
  mediaListeners.get(query)?.forEach((listener) => listener(event))
}

export function resetMatchMedia() {
  mediaState.clear()
  mediaLists.clear()
  mediaListeners.clear()
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList => {
    const listeners = mediaListeners.get(query) ?? new Set()
    mediaListeners.set(query, listeners)
    const mediaList = {
      matches: mediaState.get(query) ?? false,
      media: query,
      onchange: null,
      addEventListener: (_type, listener) => listeners.add(listener as (event: MediaQueryListEvent) => void),
      removeEventListener: (_type, listener) => listeners.delete(listener as (event: MediaQueryListEvent) => void),
      addListener: (listener) => listeners.add(listener),
      removeListener: (listener) => listeners.delete(listener),
      dispatchEvent: () => true,
    } as MediaQueryList
    const lists = mediaLists.get(query) ?? new Set()
    lists.add(mediaList)
    mediaLists.set(query, lists)
    return mediaList
  },
})
```

The polyfill is deliberately controllable rather than hard-coded: every desktop test calls `setMatchMedia("(max-width: 1023px)", false)`, every narrow test calls it with `true`, and each test calls `resetMatchMedia()` in `afterEach`. Do not read `window.matchMedia` directly in tests or silently fall back to `innerWidth`; the generated `use-mobile.ts` listener must exercise this controllable implementation.

Expected: dependency installation exits 0. Do not run Vitest until the failing test exists in Step 2.

- [ ] **Step 2: Write nonvisual browser behavior contracts before UI implementation (RED)**

Create `playwright.config.ts` now, before installing or implementing the product components:

```ts
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  baseURL: "http://127.0.0.1:3000",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
})
```

Create `tests/baseline-ui.spec.ts` with only these nonvisual contracts. They are intentionally written before the theme provider, shell, drawer, and Motion implementation:

```ts
import { expect, test } from "@playwright/test"

test.describe("baseline UI behavior (RED)", () => {
  test("pilihan tema mengalahkan sistem dan tersimpan", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" })
    await page.goto("/")
    await page.getByRole("button", { name: "Gunakan tema gelap" }).first().click()
    await expect(page.locator("html")).toHaveClass(/dark/)
    await page.reload()
    await expect(page.locator("html")).toHaveClass(/dark/)
  })

  test("desktop selalu menampilkan sidebar dan Ctrl/Cmd+B tidak mengubahnya", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto("/")
    const navigation = page.getByRole("navigation", { name: "Navigasi utama" })
    await expect(navigation).toBeVisible()
    await expect(page.getByRole("button", { name: "Buka navigasi" })).toHaveCount(0)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true)
    await page.keyboard.press("Control+b")
    await page.keyboard.press("Meta+b")
    await expect(navigation).toBeVisible()
  })

  test("tablet dan mobile mempertahankan openMobile pada Sheet", async ({ page }) => {
    for (const width of [390, 834]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto("/")
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      ).toBe(true)
      const trigger = page.getByRole("button", { name: "Buka navigasi" })
      await expect(trigger).toBeVisible()
      await trigger.click()
      const drawer = page.getByRole("dialog", { name: "Navigasi utama" })
      await expect(drawer).toBeVisible()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      ).toBe(true)
      await page.keyboard.press("Escape")
      await expect(drawer).toBeHidden()
      await expect(trigger).toBeFocused()
      await trigger.click()
      await drawer.getByRole("link", { name: "Reservasi" }).click()
      await expect(drawer).toBeHidden()
    }
  })

  test("rendered transform nonaktif pada reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/")
    const motionNodes = page.locator("[data-motion-transform]")
    await expect(motionNodes).not.toHaveCount(0)
    await expect
      .poll(() =>
        motionNodes.evaluateAll((nodes) =>
          nodes.every((node) => getComputedStyle(node).transform === "none"),
        ),
      )
      .toBe(true)
  })
})
```

Run: `pnpm exec playwright test tests/baseline-ui.spec.ts --grep "behavior \(RED\)"`

Expected: FAIL because the current page has no theme persistence, responsive shell, drawer dialog, or `[data-motion-transform]` contract. Keep this failure recorded; do not add screenshot assertions here.

- [ ] **Step 3: Write the failing theme-toggle contract test (RED)**

Create `components/theme-toggle.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const setTheme = vi.fn()
let resolvedTheme = "light"

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme, setTheme }),
}))

import { ThemeToggle } from "@/components/theme-toggle"

describe("ThemeToggle", () => {
  beforeEach(() => {
    setTheme.mockClear()
    resolvedTheme = "light"
  })

  it("menjelaskan dan menjalankan aksi tema berikutnya", async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(await screen.findByRole("button", { name: "Gunakan tema gelap" }))
    expect(setTheme).toHaveBeenCalledWith("dark")
  })

  it("menawarkan tema terang ketika tema aktif gelap", async () => {
    resolvedTheme = "dark"
    render(<ThemeToggle />)
    expect(await screen.findByRole("button", { name: "Gunakan tema terang" })).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run the focused test and observe the intended failure**

Run: `pnpm test -- components/theme-toggle.test.tsx`

Expected: FAIL because `@/components/theme-toggle` does not exist.

- [ ] **Step 5: Initialize shadcn/Base UI deterministically and install minimum components**

Run exactly:

```bash
pnpm dlx shadcn@4.21.0 init --template next --base base --preset nova --css-variables --no-rtl --no-pointer
```

`base-nova` is the CLI v4 default Base UI preset. It supplies the preset structure only; Ruvana’s approved semantic token hierarchy replaces its generated palette in `app/globals.css` during Step 6. Immediately inspect `components.json` and verify that it records the Next template, Base UI/base-nova preset, CSS variables, RSC/TSX settings, `app/globals.css`, and the existing `@/*` aliases before generating components.

Run the pinned component command once as a dry run and inspect that its output contains the complete local inventory documented below:

```bash
pnpm dlx shadcn@4.21.0 add button input field card badge skeleton empty label separator sheet sidebar tooltip use-mobile --dry-run
```

Only after the dry-run output is verified, run the real command and then install the remaining product dependencies:

```bash
pnpm dlx shadcn@4.21.0 add button input field card badge skeleton empty label separator sheet sidebar tooltip use-mobile
pnpm add motion next-themes lucide-react
```

The pinned registry's documented generated imports define the complete local inventory; do not replace it with a glob or an unspecified “dependencies” placeholder. `field.tsx` imports `@/components/ui/label` and `@/components/ui/separator`; `sidebar.tsx` imports `@/components/ui/button`, `@/components/ui/input`, `@/components/ui/separator`, `@/components/ui/sheet`, `@/components/ui/skeleton`, `@/components/ui/tooltip`, and `@/hooks/use-mobile`. Therefore this command must emit exactly these local generated files: `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/field.tsx`, `components/ui/card.tsx`, `components/ui/badge.tsx`, `components/ui/skeleton.tsx`, `components/ui/empty.tsx`, `components/ui/label.tsx`, `components/ui/separator.tsx`, `components/ui/sheet.tsx`, `components/ui/sidebar.tsx`, `components/ui/tooltip.tsx`, and `hooks/use-mobile.ts`. Package imports such as `class-variance-authority`, `lucide-react`, and the selected Base UI/shadcn runtime are dependencies, not additional local generated files.

Re-open `components.json` after the real add and verify it still points to `app/globals.css`, keeps Tailwind config blank for v4, preserves `rsc` and `tsx`, identifies Base UI/base-nova, and retains the aliases emitted by the exact init command. If the installed CLI schema uses a field name different from the current CLI output, preserve the CLI-generated field rather than inventing one.

- [ ] **Step 6: Replace generated palette with the approved token hierarchy**

In `app/globals.css`, retain `@import "tailwindcss"`, generated animation imports required by shadcn, and expose only these public primitive families through `@theme inline`:

```css
@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-sans: var(--font-poppins);
  --color-primary-25: var(--primary-25);
  --color-primary-50: var(--primary-50);
  --color-primary-100: var(--primary-100);
  --color-primary-200: var(--primary-200);
  --color-primary-300: var(--primary-300);
  --color-primary-400: var(--primary-400);
  --color-primary-500: var(--primary-500);
  --color-primary-600: var(--primary-600);
  --color-primary-700: var(--primary-700);
  --color-primary-800: var(--primary-800);
  --color-primary-900: var(--primary-900);
  --color-primary-950: var(--primary-950);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-subdued: var(--primary-subdued);
  --color-primary-subdued-foreground: var(--primary-subdued-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-success-subdued: var(--success-subdued);
  --color-success-subdued-foreground: var(--success-subdued-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-destructive-subdued: var(--destructive-subdued);
  --color-destructive-subdued-foreground: var(--destructive-subdued-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-warning-subdued: var(--warning-subdued);
  --color-warning-subdued-foreground: var(--warning-subdued-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-control: 0.625rem;
  --radius-card: 1.25rem;
  --duration-motion-standard: var(--motion-duration-standard);
  --ease-motion-standard: var(--motion-easing-standard);
  --shadow-subtle: 0 2px 8px rgb(0 0 0 / 0.04);
}
```

Define the five complete primitive scales below. The chromatic scales preserve the reviewed Fixed generator export. The neutral scale uses the same fixed hierarchy with hue `91.5`; its `neutral-25` is the OKLCH conversion of the DESIGN canvas `#F7F5EF`. Do not create duplicate `success-*`, `destructive-*`, or `warning-*` primitive families.

```css
:root {
  --black: oklch(0% 0 0);
  --white: oklch(100% 0 0);
  --motion-duration-standard: 180ms;
  --motion-easing-standard: cubic-bezier(0.22, 1, 0.36, 1);
  --spacing-page-mobile: 1rem;
  --spacing-page-tablet: 1.75rem;
  --spacing-page-desktop: 2rem;
  --spacing-card: 1.5rem;
  --primary-25: oklch(97.18% 0.0077 121.01);
  --primary-50: oklch(95.13% 0.0201 121.01);
  --primary-100: oklch(92.26% 0.037 121.01);
  --primary-200: oklch(86.11% 0.0646 121.01);
  --primary-300: oklch(81.61% 0.0835 121.01);
  --primary-400: oklch(72.59% 0.0927 121.01);
  --primary-500: oklch(57.02% 0.0964 121.01);
  --primary-600: oklch(48.61% 0.0964 121.01);
  --primary-700: oklch(41.05% 0.0964 121.01);
  --primary-800: oklch(33.49% 0.0964 121.01);
  --primary-900: oklch(22.56% 0.0927 121.01);
  --primary-950: oklch(17.1% 0.0907 121.01);
  --neutral-25: oklch(97% 0.0082 91.48);
  --neutral-50: oklch(96% 0.0085 91.5);
  --neutral-100: oklch(95% 0.009 91.5);
  --neutral-200: oklch(93% 0.01 91.5);
  --neutral-300: oklch(91.26% 0.0125 91.53);
  --neutral-400: oklch(82% 0.011 91.5);
  --neutral-500: oklch(70% 0.01 91.5);
  --neutral-600: oklch(58% 0.01 91.5);
  --neutral-700: oklch(47.83% 0.0098 91.58);
  --neutral-800: oklch(35% 0.008 91.5);
  --neutral-900: oklch(26.45% 0 89.88);
  --neutral-950: oklch(20.61% 0.005 91.5);
  --green-25: oklch(97.23% 0.0085 145.19);
  --green-50: oklch(95.32% 0.022 145.19);
  --green-100: oklch(92.64% 0.0406 145.19);
  --green-200: oklch(86.9% 0.0708 145.19);
  --green-300: oklch(82.69% 0.0916 145.19);
  --green-400: oklch(74.27% 0.1017 145.19);
  --green-500: oklch(59.73% 0.1058 145.19);
  --green-600: oklch(50.79% 0.1058 145.19);
  --green-700: oklch(42.73% 0.1058 145.19);
  --green-800: oklch(34.68% 0.1058 145.19);
  --green-900: oklch(23.05% 0.1018 145.19);
  --green-950: oklch(17.24% 0.0995 145.19);
  --red-25: oklch(97.1% 0.0096 25.2);
  --red-50: oklch(94.85% 0.025 25.2);
  --red-100: oklch(91.7% 0.046 25.2);
  --red-200: oklch(84.95% 0.0803 25.2);
  --red-300: oklch(80% 0.1038 25.2);
  --red-400: oklch(70.1% 0.1153 25.2);
  --red-500: oklch(52.99% 0.12 25.2);
  --red-600: oklch(45.4% 0.12 25.2);
  --red-700: oklch(38.56% 0.12 25.2);
  --red-800: oklch(31.72% 0.12 25.2);
  --red-900: oklch(21.84% 0.1154 25.2);
  --red-950: oklch(16.9% 0.1128 25.2);
  --yellow-25: oklch(97.5% 0.008 75.06);
  --yellow-50: oklch(96.24% 0.0208 75.06);
  --yellow-100: oklch(94.48% 0.0384 75.06);
  --yellow-200: oklch(90.7% 0.067 75.06);
  --yellow-300: oklch(87.93% 0.0866 75.06);
  --yellow-400: oklch(82.39% 0.0962 75.06);
  --yellow-500: oklch(72.82% 0.1001 75.06);
  --yellow-600: oklch(61.26% 0.1001 75.06);
  --yellow-700: oklch(50.85% 0.1001 75.06);
  --yellow-800: oklch(40.44% 0.1001 75.06);
  --yellow-900: oklch(25.41% 0.0963 75.06);
  --yellow-950: oklch(17.89% 0.0941 75.06);
}
```

Map semantic roles as follows:

```css
:root {
  color-scheme: light;
  --background: var(--neutral-25);
  --foreground: var(--neutral-900);
  --card: var(--white);
  --card-foreground: var(--neutral-900);
  --popover: var(--white);
  --popover-foreground: var(--neutral-900);
  --primary: var(--primary-600);
  --primary-foreground: var(--primary-50);
  --primary-subdued: var(--primary-50);
  --primary-subdued-foreground: var(--primary-700);
  --secondary: var(--neutral-100);
  --secondary-foreground: var(--neutral-800);
  --muted: var(--neutral-100);
  --muted-foreground: var(--neutral-700);
  --accent: var(--neutral-100);
  --accent-foreground: var(--neutral-800);
  --success: var(--green-600);
  --success-foreground: var(--green-25);
  --success-subdued: var(--green-50);
  --success-subdued-foreground: var(--green-700);
  --destructive: var(--red-600);
  --destructive-foreground: var(--red-25);
  --destructive-subdued: var(--red-50);
  --destructive-subdued-foreground: var(--red-700);
  --warning: var(--yellow-500);
  --warning-foreground: var(--yellow-900);
  --warning-subdued: var(--yellow-50);
  --warning-subdued-foreground: var(--yellow-800);
  --border: var(--neutral-300);
  --input: var(--neutral-300);
  --ring: var(--primary-600);
  --sidebar: var(--primary-950);
  --sidebar-foreground: var(--primary-50);
  --sidebar-primary: var(--primary-500);
  --sidebar-primary-foreground: var(--primary-950);
  --sidebar-accent: var(--primary-900);
  --sidebar-accent-foreground: var(--primary-50);
  --sidebar-border: var(--primary-900);
  --sidebar-ring: var(--primary-400);
}

.dark {
  color-scheme: dark;
  --background: var(--neutral-950);
  --foreground: var(--neutral-50);
  --card: var(--neutral-900);
  --card-foreground: var(--neutral-50);
  --popover: var(--neutral-900);
  --popover-foreground: var(--neutral-50);
  --primary: var(--primary-400);
  --primary-foreground: var(--primary-950);
  --primary-subdued: var(--primary-900);
  --primary-subdued-foreground: var(--primary-100);
  --secondary: var(--neutral-800);
  --secondary-foreground: var(--neutral-100);
  --muted: var(--neutral-800);
  --muted-foreground: var(--neutral-300);
  --accent: var(--neutral-800);
  --accent-foreground: var(--neutral-100);
  --success: var(--green-400);
  --success-foreground: var(--green-950);
  --success-subdued: var(--green-900);
  --success-subdued-foreground: var(--green-100);
  --destructive: var(--red-400);
  --destructive-foreground: var(--red-950);
  --destructive-subdued: var(--red-900);
  --destructive-subdued-foreground: var(--red-100);
  --warning: var(--yellow-400);
  --warning-foreground: var(--yellow-950);
  --warning-subdued: var(--yellow-900);
  --warning-subdued-foreground: var(--yellow-100);
  --border: var(--neutral-800);
  --input: var(--neutral-700);
  --ring: var(--primary-400);
  --sidebar: var(--primary-950);
  --sidebar-foreground: var(--primary-50);
  --sidebar-primary: var(--primary-400);
  --sidebar-primary-foreground: var(--primary-950);
  --sidebar-accent: var(--primary-900);
  --sidebar-accent-foreground: var(--primary-50);
  --sidebar-border: var(--primary-800);
  --sidebar-ring: var(--primary-400);
}
```

Add base rules for `body`, `::selection`, `*:focus-visible`, and `@media (prefers-reduced-motion: reduce)` using only semantic variables. Do not retain the old media-query theme because `next-themes` owns the `.dark` class.

- [ ] **Step 7: Implement the provider, root integration, and minimal toggle (GREEN)**

Create `components/theme-provider.tsx` using the official shadcn adapter:

```tsx
"use client"

import type * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider(props: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props} />
}
```

Create `components/theme-toggle.tsx`:

```tsx
"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  const dark = mounted && resolvedTheme === "dark"
  const label = dark ? "Gunakan tema terang" : "Gunakan tema gelap"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      disabled={!mounted}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  )
}
```

Update `app/layout.tsx` to use `const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" })`, set `lang="id"`, add `suppressHydrationWarning`, and apply `poppins.variable` to the root `<html>` class (not only to CSS configuration). Preserve the existing Ruvana metadata exactly: title `Ruvana — Reservasi Fasilitas Kampus` and description `Sistem reservasi & pelaporan fasilitas kampus (ruang kelas, aula, laboratorium, alat, lapangan).` Do not replace it with shadcn/default metadata. Wrap children with:

```tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
  {children}
</ThemeProvider>
```

- [ ] **Step 8: Run tests and refactor without widening scope**

Run: `pnpm test -- components/theme-toggle.test.tsx`

Expected: 2 tests PASS. Keep ThemeToggle on the Button export generated by shadcn CLI 4.21.0; do not replace Base UI.

- [ ] **Step 9: Commit foundation**

```bash
git add package.json pnpm-lock.yaml components.json lib/utils.ts vitest.config.mts vitest.setup.ts playwright.config.ts app/globals.css app/layout.tsx components/theme-provider.tsx components/theme-toggle.tsx components/theme-toggle.test.tsx tests/baseline-ui.spec.ts components/ui/button.tsx components/ui/input.tsx components/ui/field.tsx components/ui/card.tsx components/ui/badge.tsx components/ui/skeleton.tsx components/ui/empty.tsx components/ui/label.tsx components/ui/separator.tsx components/ui/sheet.tsx components/ui/sidebar.tsx components/ui/tooltip.tsx hooks/use-mobile.ts
git commit -m "feat: tambahkan fondasi UI Ruvana"
```

---

### Task 2: Button, Field, dan Card contracts

**Files:**
- Modify: `components/ui/button.tsx`
- Modify: `components/ui/field.tsx`
- Modify: `components/ui/input.tsx`
- Modify: `components/ui/card.tsx`
- Create: `components/ui/button.test.tsx`
- Create: `components/ui/field.test.tsx`
- Create: `components/ui/card.test.tsx`

**Interfaces:**
- Consumes: Task 1 semantic tokens, generated Base UI primitives, `cn`.
- Produces: `Button` with `variant="primary|secondary|outline|ghost|danger"`, `loading?: boolean`, and stable content; shadcn Field composition; Card composition with optional header/content/footer.

**Blocked by:** Task 1.

- [ ] **Step 1: Write failing behavior tests (RED)**

Cover these explicit assertions:

```tsx
it("mengunci tombol dan mempertahankan nama saat loading", () => {
  render(<Button loading>Simpan perubahan</Button>)
  expect(screen.getByRole("button", { name: "Simpan perubahan" })).toBeDisabled()
  expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true")
})

it.each(["primary", "secondary", "outline", "ghost", "danger"] as const)(
  "menerima varian Button %s",
  (variant) => {
    render(<Button variant={variant}>Aksi {variant}</Button>)
    expect(screen.getByRole("button", { name: `Aksi ${variant}` })).toBeEnabled()
  },
)

it("meneruskan disabled dan mendukung ikon dekoratif sebagai child", () => {
  render(<Button disabled><Save aria-hidden="true" />Simpan</Button>)
  expect(screen.getByRole("button", { name: "Simpan" })).toBeDisabled()
})

it("menghubungkan bantuan dan error ke input", () => {
  render(
    <Field data-invalid>
      <FieldLabel htmlFor="email">Email</FieldLabel>
      <Input id="email" aria-invalid aria-describedby="email-description email-error" />
      <FieldDescription id="email-description">Gunakan email kampus.</FieldDescription>
      <FieldError id="email-error">Email tidak valid.</FieldError>
    </Field>,
  )
  expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
    "Gunakan email kampus. Email tidak valid.",
  )
})

it("meneruskan status required ke input berlabel", () => {
  render(<Field><FieldLabel htmlFor="nama">Nama</FieldLabel><Input id="nama" required /></Field>)
  expect(screen.getByRole("textbox", { name: "Nama" })).toBeRequired()
})

it("menyediakan API indikator wajib yang terlihat dan dapat diakses", () => {
  render(
    <Field>
      <FieldLabel htmlFor="wajib" required>Nama</FieldLabel>
      <Input id="wajib" required />
    </Field>,
  )
  expect(screen.getByRole("textbox", { name: "Nama (wajib)" })).toBeRequired()
  expect(screen.getByText("*", { selector: "span" })).toBeVisible()
  expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true")
  expect(screen.getByText("(wajib)", { selector: ".sr-only" })).toBeInTheDocument()
})

it("merender region card opsional tanpa membuat card interaktif", () => {
  render(<Card><CardHeader><CardTitle>Ringkasan</CardTitle></CardHeader><CardContent>Isi</CardContent><CardFooter>Aksi</CardFooter></Card>)
  expect(screen.getByText("Ringkasan")).toBeInTheDocument()
  expect(screen.queryByRole("button")).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run focused tests and observe failures**

Run: `pnpm test -- components/ui/button.test.tsx components/ui/field.test.tsx components/ui/card.test.tsx`

Expected: FAIL because Button has no `loading`/approved variants and styling/contracts are not yet adapted.

- [ ] **Step 3: Implement minimum approved behavior (GREEN)**

In `button.tsx`, extend the generated props with `loading?: boolean`; derive `disabled={disabled || loading}`, `aria-busy={loading || undefined}`, and render `LoaderCircle` as decorative `animate-spin motion-reduce:animate-none` while retaining the label in an opacity-hidden span so dimensions and accessible name stay stable. Keep only approved variants and shadcn sizes; icon size must yield a 44×44 px control.

In `field.tsx`/`input.tsx`, preserve Base UI/shadcn composition, style `[data-invalid]` and `aria-invalid` with destructive border plus a non-color cue, and keep label/help/error IDs caller-controlled as shown in the test. Extend `FieldLabel` with the explicit `required?: boolean` API. When true, render a visible `*` marked `aria-hidden="true"` and adjacent visually-hidden text `(wajib)` so the accessible label becomes “Nama (wajib)”; the API must not rely on color alone and must not infer required state from an unrelated input. Do not add form-state or validation libraries.

In `card.tsx`, retain generated exports `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, and `CardFooter`; use `rounded-card`, `p-6`, `border-border`, and `shadow-subtle`, and keep the root a non-interactive `div`.

- [ ] **Step 4: Verify GREEN and refactor**

Run the same focused command. Expected: all Task 2 tests PASS. Remove unused generated variants/imports and preserve Base UI render composition.

- [ ] **Step 5: Commit the first primitive slice**

```bash
git add components/ui/button.tsx components/ui/button.test.tsx components/ui/input.tsx components/ui/field.tsx components/ui/field.test.tsx components/ui/card.tsx components/ui/card.test.tsx
git commit -m "feat: tambahkan primitive formulir dan kartu"
```

---

### Task 3: Badge, Skeleton, dan Empty state contracts

**Files:**
- Modify: `components/ui/badge.tsx`
- Modify: `components/ui/skeleton.tsx`
- Modify: `components/ui/empty.tsx`
- Create: `components/ui/badge.test.tsx`
- Create: `components/ui/skeleton.test.tsx`
- Create: `components/ui/empty.test.tsx`

**Interfaces:**
- Consumes: Task 1 semantic tokens and generated shadcn files.
- Produces: Badge variants `pending|success|danger|info|neutral`; inert `Skeleton`; composable `Empty` exports.

**Blocked by:** Task 1.

- [ ] **Step 1: Write failing semantic tests (RED)**

```tsx
it.each(["pending", "success", "danger", "info", "neutral"] as const)(
  "merender badge %s dengan teks",
  (variant) => {
    render(<Badge variant={variant}>{variant}</Badge>)
    expect(screen.getByText(variant)).toBeVisible()
  },
)

it("menandai skeleton sebagai presentasional", () => {
  render(<Skeleton data-testid="skeleton" />)
  expect(screen.getByTestId("skeleton")).toHaveAttribute("aria-hidden", "true")
})

it("mengomposisikan judul, deskripsi, ikon dekoratif, dan aksi", () => {
  render(
    <Empty>
      <EmptyHeader><EmptyMedia variant="icon"><Inbox aria-hidden="true" /></EmptyMedia><EmptyTitle>Belum ada data</EmptyTitle><EmptyDescription>Coba lagi nanti.</EmptyDescription></EmptyHeader>
      <EmptyContent><Button>Muat ulang</Button></EmptyContent>
    </Empty>,
  )
  expect(screen.getByRole("button", { name: "Muat ulang" })).toBeEnabled()
})
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `pnpm test -- components/ui/badge.test.tsx components/ui/skeleton.test.tsx components/ui/empty.test.tsx`

Expected: FAIL for unsupported Badge variants and missing Skeleton presentation attribute.

- [ ] **Step 3: Implement semantic variants and inert loading UI (GREEN)**

Map Badge classes exactly by role: pending→warning subdued pair, success→success subdued pair, danger→destructive subdued pair, info→primary subdued pair, neutral→secondary pair. Each variant must retain text children; do not infer or inject status labels.

Set `aria-hidden="true"` on Skeleton by default, retain `animate-pulse`, and add `motion-reduce:animate-none`. Preserve the generated Empty composition and replace any sample/icon dependency from Tabler with Lucide in callers only; `Empty` itself accepts React children and imports no icon library.

- [ ] **Step 4: Run tests and refactor**

Run the same focused command. Expected: all Task 3 tests PASS.

- [ ] **Step 5: Commit the second primitive slice**

```bash
git add components/ui/badge.tsx components/ui/badge.test.tsx components/ui/skeleton.tsx components/ui/skeleton.test.tsx components/ui/empty.tsx components/ui/empty.test.tsx
git commit -m "feat: tambahkan primitive status dan empty state"
```

---

### Task 4: Responsive application shell

**Files:**
- Create: `components/app-shell/types.ts`
- Create: `components/app-shell/app-sidebar.tsx`
- Create: `components/app-shell/mobile-app-bar.tsx`
- Create: `components/app-shell/app-shell.tsx`
- Create: `components/app-shell/app-shell.test.tsx`
- Create: `lib/motion.ts`
- Create: `lib/motion.test.ts`
- Modify: `components/ui/sidebar.tsx`
- Modify: `hooks/use-mobile.ts`

**Interfaces:**
- Consumes: locked interfaces, Button, Sidebar/Sheet internals, ThemeToggle, Motion, Lucide, `usePathname`, and the controllable `setMatchMedia` test helper.
- Produces: `AppShell(props: AppShellProps)`, `AppSidebar`, and `MobileAppBar` with server-owned input data.

**Blocked by:** Task 2 and Task 3.

- [ ] **Step 1: Write failing shell and accessibility tests (RED)**

Import `afterEach` from `vitest` and import `resetMatchMedia` plus `setMatchMedia` from `@/vitest.setup`; call `resetMatchMedia()` in `afterEach`. Mock `next/navigation` to return `/reservasi`, import `axe` explicitly with `import { axe } from "vitest-axe"`, render a fixture with two labeled groups, and assert the narrow contract:

```tsx
expect(screen.getAllByRole("link", { name: "Reservasi" })[0]).toHaveAttribute("aria-current", "page")
expect(screen.getByText("Pratinjau UI")).toBeInTheDocument()
expect(screen.getAllByRole("button", { name: "Buka navigasi" })[0]).toBeInTheDocument()
expect(screen.getAllByRole("link", { name: "Keluar" })[0]).toHaveAttribute("href", "/keluar")
const accessibility = await axe(container)
expect(accessibility.violations).toEqual([])
```

Add these separate viewport-state tests before implementation. Import the helpers with `import { resetMatchMedia, setMatchMedia } from "@/vitest.setup"`; call `resetMatchMedia()` in `afterEach`. The desktop test must call `setMatchMedia("(max-width: 1023px)", false)`, assert the navigation is visible, assert “Buka navigasi” does not exist, dispatch both `new KeyboardEvent("keydown", { key: "b", ctrlKey: true })` and the equivalent `metaKey: true` event on `window`, and assert the navigation remains visible. The narrow test must call `setMatchMedia("(max-width: 1023px)", true)`, open the Sheet, and find its dialog name “Navigasi utama”. Query enabled links, buttons, inputs, selects, and elements with non-negative `tabindex` inside the dialog; press Tab `focusableElements.length + 1` times and assert `dialog.contains(document.activeElement)` after every press, proving focus cannot escape. Then press Escape, verify closure, and verify focus returns to “Buka navigasi”. Open it again, click the “Reservasi” link, and assert the dialog closes. Add a rerender/pathname test proving active state moves without role filtering inside the shell. The logout assertion must also verify an ordinary anchor with `href="/keluar"`, with no form action, mutation callback, or GET side effect.

Create `lib/motion.test.ts` first with this reduced-motion contract:

```ts
expect(getMotionTransition(null)).toEqual({
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
})
expect(getMotionTransition(true)).toEqual({ duration: 0 })
expect(getMotionTransition(false)).toEqual({
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
})
```

In the same RED file add the drift-prevention test. Read `app/globals.css` with `readFileSync(new URL("../app/globals.css", import.meta.url), "utf8")` and assert it contains `--motion-duration-standard: ${motionTokens.cssDuration};` and `--motion-easing-standard: ${motionTokens.cssEasing};`. This test is the explicit synchronization guard between semantic CSS tokens and typed Motion equivalents; it must fail if either side changes independently.

- [ ] **Step 2: Run focused test and observe RED**

Run: `pnpm test -- components/app-shell/app-shell.test.tsx lib/motion.test.ts`

Expected: FAIL because application-shell modules and `getMotionTransition` do not exist.

- [ ] **Step 3: Implement contracts and breakpoint (GREEN)**

Create `types.ts` exactly from “Interfaces Locked for All Tasks”. In generated `hooks/use-mobile.ts`, set the media query boundary to `(max-width: 1023px)` so both tablet and mobile use the accessible Sheet path. In `components/ui/sidebar.tsx`, set desktop width to `15rem`, mobile width to `18rem`, and use desktop classes beginning at `lg`. Remove the generated Ctrl/Cmd+B effect entirely: desktop sidebar state is permanently expanded and visible, `setOpen` is a no-op for desktop, and `toggleSidebar()` may only toggle `openMobile` when `isMobile` is true. Keep the provider’s `openMobile`/`setOpenMobile` state for the narrow Sheet. Evaluate the narrow Sheet branch before `collapsible="none"`; render the desktop branch as non-collapsible/permanently visible, and never render `SidebarRail` or use `collapsible="icon"`.

Build grouped menu markup with semantic `<nav aria-label="Navigasi utama">`; each `SidebarMenuButton` renders a Next `Link`, receives `isActive`, `aria-current={active ? "page" : undefined}`, a Lucide icon with `aria-hidden`, and visible Indonesian label. The mobile renderer gets `setOpenMobile` from the generated sidebar context and calls `setOpenMobile(false)` after a navigation link is activated. Render brand in header and account name/role plus `LogOut` link in footer. Do not render search, version/team switchers, projects, submenus, or authorization conditions.

Use `SidebarProvider`, desktop `AppSidebar`, a `<header>` app bar visible below `lg`, and `SidebarInset`/`main` for children. The app bar has a 44×44 “Buka navigasi” trigger wired to `setOpenMobile(true)` and ThemeToggle. Place another ThemeToggle in the desktop sidebar footer. Ensure the generated mobile Sheet path contains a visually hidden Sheet title “Navigasi utama” so its dialog has an accessible name. The sidebar logout control is an ordinary `Link href={logoutDestination}` to the safe destination page; it performs no session mutation.

- [ ] **Step 4: Add restrained Motion without replacing Base UI state management**

Create `lib/motion.ts` with typed Motion equivalents and export `getMotionTransition(reduceMotion: boolean | null)`. It must reduce only when `reduceMotion === true`; both `false` and `null` return `{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }`, while `true` returns `{ duration: 0 }`. Export exactly `motionTokens = { durationSeconds: 0.18, ease: [0.22, 1, 0.36, 1] as const, cssDuration: "180ms", cssEasing: "cubic-bezier(0.22, 1, 0.36, 1)" } as const` for the drift test. Keep the synchronized semantic CSS tokens `--motion-duration-standard: 180ms` and `--motion-easing-standard: cubic-bezier(0.22, 1, 0.36, 1)` in `app/globals.css`; use those variables for CSS transitions rather than raw motion duration/easing values. Use `motion/react` only around the drawer navigation content, catalog outlet entrance, and active indicator. Let Base UI Sheet retain ownership of overlay, focus trap, Escape, inert background, and focus restoration. Read `useReducedMotion()` and call:

```tsx
const transition = getMotionTransition(reduceMotion)
```

For active navigation, render one decorative `motion.span` per visible navigation context using `layoutId="active-navigation-desktop"` or `layoutId="active-navigation-drawer"`, `aria-hidden="true"`, and no semantic information. Mark each animated wrapper with `data-motion-transform`. Animate drawer navigation content from `{ opacity: 0, x: reduceMotion === true ? 0 : -8 }` to `{ opacity: 1, x: 0 }`; Base UI still controls the panel lifecycle. For outlet entrance, use `{ opacity: 0, y: reduceMotion === true ? 0 : 8 }` to `{ opacity: 1, y: 0 }`. Do not animate Button/Card/Badge/Field/Empty. The rendered Playwright reduced-motion contract must observe every `[data-motion-transform]` node with computed `transform === "none"` after `page.emulateMedia({ reducedMotion: "reduce" })`.

- [ ] **Step 5: Run shell tests and refactor**

Run: `pnpm test -- components/app-shell/app-shell.test.tsx lib/motion.test.ts`

Expected: shell behavior and axe assertions PASS. Remove duplicate app-bar/sidebar menu markup by sharing a private navigation-list renderer inside `app-sidebar.tsx`; do not create a generic navigation framework.

- [ ] **Step 6: Commit shell slice**

```bash
git add hooks/use-mobile.ts components/ui/sidebar.tsx components/app-shell lib/motion.ts lib/motion.test.ts
git commit -m "feat: tambahkan shell aplikasi responsif"
```

---

### Task 5: Static Core 6 catalog

**Files:**
- Modify: `app/page.tsx`
- Create: `app/page.test.tsx`
- Delete: `components/placeholder.tsx`

**Interfaces:**
- Consumes: `AppShell`, Core 6 exports, Lucide icons, and static locked interface values.
- Produces: synchronous Server Component preview route `/` with no domain or auth state.

**Blocked by:** Task 4.

- [ ] **Step 1: Write the failing catalog test (RED)**

Mock only client boundaries (`usePathname`, `next-themes`, reduced motion), render `Home`, and assert a level-one heading “Baseline UI Ruvana”, visible “Pratinjau UI”, headings for Button/Field/Card/Badge/Skeleton/Empty state, Indonesian navigation labels, and absence of role-switching controls. Navigation terms such as “Reservasi” and “Fasilitas” are allowed; assert instead that no facility name, reservation owner identity, reservation purpose, schedule, capacity, approval action, or fake operational count appears.

- [ ] **Step 2: Run the test and observe RED**

Run: `pnpm test -- app/page.test.tsx`

Expected: FAIL because the existing Fase-0 page lacks the shell and catalog.

- [ ] **Step 3: Build the minimum static catalog (GREEN)**

Use static navigation groups with `LayoutDashboard`, `CalendarDays`, `Building2`, `ClipboardList`, and `Settings`; account `{ displayName: "Ayu Pratama", roleLabel: "Pengguna" }`; and `logoutDestination="/keluar"`. The content must start with a small “Pratinjau UI” eyebrow and `<h1>Baseline UI Ruvana</h1>`, then six regions with these exact section/heading pairs: `aria-labelledby="button-title"`/`id="button-title"`, `field-title`, `card-title`, `badge-title`, `skeleton-title`, and `empty-title`. The visible headings are respectively “Button”, “Field”, “Card”, “Badge”, “Skeleton”, and “Empty state”. Field examples use `FieldLabel required` for the visible `*` plus accessible `(wajib)` indicator, labels/help/error IDs, and a matching `required` input; status badges include Indonesian text; Skeleton sits under a visible “Contoh pemuatan” label; Empty uses `Inbox` and an outline Button. The `/keluar` value is only a safe same-origin destination page rendered by the shell’s ordinary link; it is not a logout mutation endpoint.

Keep this page synchronous and static. Do not add `"use client"`, event-backed fake mutations, fake statistics, facility data, auth controls, or role switchers.

- [ ] **Step 4: Run unit suite and refactor**

Run: `pnpm test`

Expected: all unit/component tests PASS. Delete `components/placeholder.tsx` after confirming it has no imports.

- [ ] **Step 5: Commit catalog slice**

```bash
git add app/page.tsx app/page.test.tsx components/placeholder.tsx
git commit -m "feat: tampilkan katalog baseline UI"
```

---

### Task 6: Responsive, theme, contrast, and visual verification

**Files:**
- Modify: `tests/baseline-ui.spec.ts` (behavior contracts were created and run RED in Task 1)
- Create: `tests/baseline-ui.spec.ts-snapshots/*` (generated by Playwright for the project OS only)
- Modify: none; Task 1 already adds `playwright.config.ts` and the E2E dependencies.

**Interfaces:**
- Consumes: completed `/` catalog and browser-visible shell contracts.
- Produces: repeatable Chromium E2E and visual evidence for light/dark desktop plus mobile drawer.

**Blocked by:** Task 5.

- [ ] **Step 1: Append visual-only acceptance tests after behavior contracts are GREEN**

Do not recreate `playwright.config.ts` or the behavior tests here. Task 1 created and ran those nonvisual contracts before the corresponding UI implementation. Add only `import AxeBuilder from "@axe-core/playwright"` to the existing import section of `tests/baseline-ui.spec.ts`; do not redeclare its existing `expect` or `test` imports. Append only this visual suite; screenshot assertions remain the final visual acceptance layer:

```ts
import AxeBuilder from "@axe-core/playwright"

test.describe("baseline UI visual acceptance", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`desktop ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme })
      await page.goto("/")
      await expect(page.locator("html")).toHaveClass(new RegExp(theme))
      await expect(page.getByRole("navigation", { name: "Navigasi utama" })).toBeVisible()
      await expect(page.getByRole("heading", { level: 1, name: "Baseline UI Ruvana" })).toBeVisible()
      const accessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze()
      expect(accessibility.violations).toEqual([])
      await expect(page).toHaveScreenshot(`baseline-desktop-${theme}.png`, { fullPage: true })
    })

    test(`drawer mobile ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme })
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto("/")
      const trigger = page.getByRole("button", { name: "Buka navigasi" })
      await trigger.click()
      await expect(page.getByRole("dialog", { name: "Navigasi utama" })).toBeVisible()
      await expect(page).toHaveScreenshot(`baseline-mobile-drawer-${theme}.png`, { fullPage: true })
    })
  }

  test("tidak memiliki overflow horizontal pada breakpoint akhir", async ({ page }) => {
    for (const width of [390, 834, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto("/")
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      ).toBe(true)
    }
  })

  for (const deficiency of ["protanopia", "deuteranopia", "tritanopia"] as const) {
    test(`status tetap terbaca dengan ${deficiency}`, async ({ page }) => {
      const session = await page.context().newCDPSession(page)
      await session.send("Emulation.setEmulatedVisionDeficiency", { type: deficiency })
      await page.goto("/")
      const badges = page.getByRole("region", { name: "Badge" })
      await expect(badges.getByText("Menunggu")).toBeVisible()
      await expect(badges.getByText("Disetujui")).toBeVisible()
      await expect(badges.getByText("Ditolak")).toBeVisible()
      await expect(badges).toHaveScreenshot(`badge-${deficiency}.png`)
    })
  }
})
```

- [ ] **Step 2: Run behavior contracts, then visual tests**

Run `pnpm exec playwright test tests/baseline-ui.spec.ts --grep "behavior \(RED\)"` first; it must now PASS and must have been authored before the corresponding implementation in Task 1. Then run `pnpm exec playwright install chromium && pnpm exec playwright test tests/baseline-ui.spec.ts --grep "visual acceptance"`.

Expected: the behavior command passes. The visual command fails only because approved screenshot baselines do not exist yet; any functional or axe failure must be fixed before snapshots are accepted.

- [ ] **Step 3: Create reviewed baselines (GREEN)**

Run `pnpm test:e2e -- --update-snapshots`, inspect all seven PNGs manually, and reject/regenerate them if labels clip, focus is hidden, canvas loses its warm character, primary dominates neutral surfaces, dark theme flashes light, or status meaning disappears under a simulated deficiency. Then run `pnpm test:e2e` without update.

Expected: all browser tests PASS against the reviewed screenshots.

- [ ] **Step 4: Verify semantic contrast and color-independent states**

Confirm the AxeBuilder scans pass in both themes; these exercise the semantic pairs as actually rendered rather than trusting generator metadata. Manually inspect keyboard focus boundaries in both desktop screenshots and verify at least 3:1 against adjacent colors with browser DevTools contrast details. Required minimums remain 4.5:1 for normal text, 3:1 for large text, and 3:1 for control boundaries/focus. If a pair fails, remap it to another shade in the same approved primitive scale and rerun the full E2E file—never add a new palette.

- [ ] **Step 5: Run project verification in required order**

Run:

```bash
pnpm prisma generate
pnpm lint
pnpm check:banned
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm test
pnpm test:e2e
pnpm build
```

Expected: every command exits 0. `next typegen` must precede TypeScript; the production build must not replace the explicit typecheck.

- [ ] **Step 6: Self-review and commit verification assets**

Review for spec compliance first, then code quality: no raw meaningful colors in components, no second icon family, no role filtering, no fake domain data, no icon rail/search/team/project/submenu features, no hydration warning, no lost focus, and no `.superpowers/` files staged.

```bash
git add tests/baseline-ui.spec.ts tests/baseline-ui.spec.ts-snapshots
git commit -m "test: verifikasi baseline UI responsif"
```

This final implementation commit stages only the Task 6 test assets. Do not restage `docs/superpowers/specs/`, this plan, or already-committed foundation files.

## Final Definition of Done

- All behavior RED contracts in Tasks 1–5 are authored and failing before their corresponding GREEN implementation; Task 6 adds only the final visual acceptance tests after those behavior contracts pass.
- Unit/component tests cover the public primitive and shell contracts without large DOM snapshots.
- Playwright proves mobile/tablet/desktop behavior, theme persistence, drawer keyboard flow, and reviewed light/dark screenshots.
- Semantic contrast checks meet WCAG AA and state meaning survives color-vision simulation.
- Required project verification order completes with exit code 0.
- Git contains only intentional source, test, lockfile, screenshot, and documentation changes; `.superpowers/` remains local-only.
