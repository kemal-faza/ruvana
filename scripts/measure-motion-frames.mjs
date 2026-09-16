// Mengukur long task dan frame landing page saat entrance dan scroll.
// Dijalankan terhadap server yang sudah hidup di RUVANA_BASE_URL.
import { chromium } from "@playwright/test"

const baseUrl = process.env.RUVANA_BASE_URL ?? "http://127.0.0.1:3000"
const budgets = { maxFrameP95Ms: 20, maxFrameMaxMs: 50, maxLongTaskTotalMs: 400 }

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

await page.addInitScript(() => {
  window.__motionMeasurements = { longTasks: [], frames: [] }

  if ("PerformanceObserver" in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__motionMeasurements.longTasks.push(entry.duration)
        }
      })
      observer.observe({ entryTypes: ["longtask"] })
    } catch {
      // longtask tidak didukung; pengukuran frame tetap berjalan.
    }
  }

  let previous = performance.now()
  function recordFrame(now) {
    window.__motionMeasurements.frames.push(now - previous)
    previous = now
    if (window.__motionMeasurements.frames.length < 900) {
      requestAnimationFrame(recordFrame)
    }
  }
  requestAnimationFrame(recordFrame)
})

await page.goto(`${baseUrl}/`, { waitUntil: "load" })
// Pemanasan: permintaan pertama ke server yang baru hidup memicu kompilasi dan
// first paint, yang menghasilkan long task framework — bukan biaya motion.
// Ukur setelah server benar-benar panas agar gate mengukur sistem motion.
await page.reload({ waitUntil: "load" })
await page.waitForTimeout(1500)

const height = await page.evaluate(() => document.body.scrollHeight)
for (let y = 0; y < height; y += 400) {
  await page.evaluate((nextY) => window.scrollTo({ top: nextY, behavior: "instant" }), y)
  await page.waitForTimeout(120)
}

const measurements = await page.evaluate(() => window.__motionMeasurements)
await browser.close()

const longTasks = measurements.longTasks
const frames = measurements.frames.filter((value) => value > 0)
const sorted = [...frames].sort((left, right) => left - right)
const percentile = (ratio) => sorted[Math.floor(sorted.length * ratio)] ?? 0

const report = {
  baseUrl,
  frameCount: frames.length,
  frameP50Ms: Number(percentile(0.5).toFixed(2)),
  frameP95Ms: Number(percentile(0.95).toFixed(2)),
  frameMaxMs: Number((sorted.at(-1) ?? 0).toFixed(2)),
  longTaskCount: longTasks.length,
  longTaskMaxMs: Number(Math.max(0, ...longTasks).toFixed(2)),
  longTaskTotalMs: Number(longTasks.reduce((total, value) => total + value, 0).toFixed(2)),
  budgets,
}

console.log(JSON.stringify(report, null, 2))

const exceeded =
  report.frameP95Ms > budgets.maxFrameP95Ms ||
  report.frameMaxMs > budgets.maxFrameMaxMs ||
  report.longTaskTotalMs > budgets.maxLongTaskTotalMs
process.exit(exceeded ? 1 : 0)
