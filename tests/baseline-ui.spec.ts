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
