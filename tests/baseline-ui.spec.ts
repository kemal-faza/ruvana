import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

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

test.describe("baseline UI visual acceptance", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`desktop ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme })
      await page.goto("/")
      await expect(page.locator("html")).toHaveClass(new RegExp(theme))
      await expect(page.getByRole("navigation", { name: "Navigasi utama" })).toBeVisible()
      await expect(page.getByRole("heading", { level: 1, name: "Baseline UI Ruvana" })).toBeVisible()
      await expect
        .poll(() =>
          page.locator("[data-motion-transform]").evaluateAll((nodes) =>
            nodes.every(
              (node) =>
                getComputedStyle(node).opacity === "1" &&
                getComputedStyle(node).transform === "none",
            ),
          ),
        )
        .toBe(true)
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
