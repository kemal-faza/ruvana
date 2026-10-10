import { execFile } from "node:child_process"
import { createServer } from "node:http"
import { resolve } from "node:path"
import { promisify } from "node:util"
import { describe, expect, it } from "vitest"

const run = promisify(execFile)
const script = resolve(process.cwd(), "scripts/check-production-cron.mjs")

describe("verifikasi cron Production", () => {
  it("memastikan panggilan anonim 401 dan bearer 200", async () => {
    const requests: string[] = []
    const server = createServer((request, response) => {
      requests.push(request.headers.authorization ?? "anonim")
      if (request.headers.authorization !== "Bearer kunci-uji") {
        response.writeHead(401).end()
        return
      }
      response.writeHead(200, { "Content-Type": "application/json" })
      response.end(JSON.stringify({ expired: 2, processedAt: "2026-10-09T00:00:00.000Z" }))
    })
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done))
    try {
      const address = server.address()
      if (!address || typeof address === "string") throw new Error("Port uji tidak tersedia")
      const { stdout } = await run(process.execPath, [script], {
        env: { NODE_ENV: "test", NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${address.port}`, CRON_SECRET: "kunci-uji" },
      })
      expect(stdout).toContain("Cron Production lulus")
      expect(requests).toEqual(["anonim", "Bearer kunci-uji"])
    } finally {
      server.close()
    }
  })
})
