import { execFile } from "node:child_process"
import { createServer, type RequestListener } from "node:http"
import { resolve } from "node:path"
import { promisify } from "node:util"
import { describe, expect, it } from "vitest"

const run = promisify(execFile)
const script = resolve(process.cwd(), "scripts/check-production-cron.mjs")

interface Hasil {
  ok: boolean
  stdout: string
  stderr: string
}

/** Jalankan script terhadap server uji lokal dan tangkap keluarnya. */
async function jalankanDenganServer(handler: RequestListener): Promise<Hasil> {
  const server = createServer(handler)
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done))
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("Port uji tidak tersedia")
  try {
    const { stdout } = await run(process.execPath, [script], {
      env: { NODE_ENV: "test", NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${address.port}`, CRON_SECRET: "kunci-uji" },
    })
    return { ok: true, stdout, stderr: "" }
  } catch (failure) {
    const keluaran = failure as { stdout?: string; stderr?: string }
    return { ok: false, stdout: keluaran.stdout ?? "", stderr: keluaran.stderr ?? "" }
  } finally {
    server.close()
  }
}

describe("verifikasi cron Production", () => {
  it("memastikan panggilan anonim 401 dan bearer 200", async () => {
    const requests: string[] = []
    const hasil = await jalankanDenganServer((request, response) => {
      requests.push(request.headers.authorization ?? "anonim")
      if (request.headers.authorization !== "Bearer kunci-uji") {
        response.writeHead(401).end()
        return
      }
      response.writeHead(200, { "Content-Type": "application/json" })
      response.end(JSON.stringify({ expired: 2, processedAt: "2026-10-09T00:00:00.000Z" }))
    })

    expect(hasil.ok).toBe(true)
    expect(hasil.stdout).toContain("Cron Production lulus")
    expect(requests).toEqual(["anonim", "Bearer kunci-uji"])
  })

  it("menjelaskan alihan ke SSO sebagai pelindung Deployment Protection", async () => {
    const hasil = await jalankanDenganServer((_request, response) => {
      response.writeHead(302, { Location: "https://vercel.com/sso-api?url=https%3A%2F%2Fruvana.example.invalid%2F" })
      response.end()
    })

    expect(hasil.ok).toBe(false)
    expect(hasil.stderr).toContain("302")
    expect(hasil.stderr).toContain("Deployment Protection")
    expect(hasil.stderr).toContain("domain kanonis")
  })

  it("menyebut tujuan alihan biasa tanpa menuduh Deployment Protection", async () => {
    const hasil = await jalankanDenganServer((_request, response) => {
      response.writeHead(301, { Location: "https://situs-lain.example.invalid/" })
      response.end()
    })

    expect(hasil.ok).toBe(false)
    expect(hasil.stderr).toContain("Dialihkan ke https://situs-lain.example.invalid/")
    expect(hasil.stderr).not.toContain("Deployment Protection")
  })

  it("melaporkan status tak terduga apa adanya", async () => {
    const hasil = await jalankanDenganServer((_request, response) => {
      response.writeHead(500).end()
    })

    expect(hasil.ok).toBe(false)
    expect(hasil.stderr).toContain("membalas 500; diharapkan 401")
    expect(hasil.stderr).not.toContain("Deployment Protection")
  })
})
