import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { createServer } from "node:net"
import { dirname, join } from "node:path"
import { setTimeout as delay } from "node:timers/promises"
import { fileURLToPath } from "node:url"

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const nextCli = join(projectRoot, "node_modules", "next", "dist", "bin", "next")
const protectedRoutes = ["/reports", "/petugas", "/petugas/antrian", "/petugas/pengaturan"]

async function unusedPort() {
  const probe = createServer()
  await new Promise((resolve, reject) => {
    probe.once("error", reject)
    probe.listen(0, "127.0.0.1", resolve)
  })
  const address = probe.address()
  assert.ok(address && typeof address !== "string")
  await new Promise((resolve) => probe.close(resolve))
  return address.port
}

const port = await unusedPort()
const origin = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, [nextCli, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: projectRoot,
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
})
let serverOutput = ""
let startError = null
for (const stream of [server.stdout, server.stderr]) {
  stream.on("data", (chunk) => {
    serverOutput = (serverOutput + chunk.toString()).slice(-8000)
  })
}
server.on("error", (error) => {
  startError = error
})

async function waitUntilReady() {
  const deadline = Date.now() + 30_000
  let lastProbeError = null
  while (Date.now() < deadline) {
    if (startError || server.exitCode !== null) {
      throw new Error(`Server gagal dimulai: ${startError?.message ?? serverOutput}`)
    }
    try {
      const response = await fetch(`${origin}/login`, { signal: AbortSignal.timeout(2000) })
      if (response.ok) return
    } catch (error) {
      lastProbeError = error
    }
    await delay(200)
  }
  throw new Error(`Server belum siap setelah 30 detik: ${lastProbeError?.message ?? serverOutput}`)
}

try {
  await waitUntilReady()
  for (const path of protectedRoutes) {
    const response = await fetch(`${origin}${path}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    })
    assert.ok(response.status >= 300 && response.status < 400, `${path}: status ${response.status}, perlu 3xx`)
    const destination = new URL(response.headers.get("location") ?? "", origin)
    assert.equal(destination.origin, origin, `${path}: redirect harus tetap di aplikasi`)
    assert.equal(destination.pathname, "/login", `${path}: redirect harus menuju /login`)
    const body = await response.text()
    assert.equal(/<meta[^>]*http-equiv=["']?refresh/i.test(body), false,
      `${path}: respons anonim tidak boleh memakai meta refresh`)
    assert.equal(/data-slot=["']sidebar|Navigasi utama/i.test(body), false,
      `${path}: respons anonim tidak boleh memuat shell terlindungi`)
    console.log(`✓ GET ${path} → ${response.status} ${destination.pathname}`)
  }
} finally {
  if (server.exitCode === null) {
    const exited = once(server, "exit").catch(() => {})
    server.kill()
    await Promise.race([exited, delay(5000)])
    if (server.exitCode === null) server.kill("SIGKILL")
  }
}
