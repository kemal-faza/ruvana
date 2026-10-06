import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { createHash, randomBytes } from "node:crypto"
import { once } from "node:events"
import { createServer } from "node:net"
import { dirname, join } from "node:path"
import { setTimeout as delay } from "node:timers/promises"
import { fileURLToPath } from "node:url"
import pg from "pg"

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const nextCli = join(projectRoot, "node_modules", "next", "dist", "bin", "next")
const protectedRoutes = ["/reports", "/petugas", "/petugas/antrian", "/petugas/pengaturan"]
const roleRoutes = {
  petugas: ["/petugas", "/petugas/antrian", "/petugas/pengaturan"],
  admin: ["/petugas/antrian"],
}

async function seededSession(client, role) {
  const { rows } = await client.query(
    'SELECT id, role, status FROM users WHERE email = $1',
    [`${role}@ruvana.test`],
  )
  assert.equal(rows.length, 1, `Akun seed ${role} harus tersedia`)
  assert.equal(rows[0].role, role)
  assert.equal(rows[0].status, "ACTIVE")
  const token = randomBytes(32).toString("base64url")
  const tokenHash = createHash("sha256").update(token).digest("hex")
  await client.query(
    'INSERT INTO sessions ("tokenHash", "userId", "expiresAt") VALUES ($1, $2, $3)',
    [tokenHash, rows[0].id, new Date(Date.now() + 60_000)],
  )
  return { cookie: `ruvana_session=${token}`, tokenHash }
}

async function checkRedirect(path, cookie, expectedPath) {
  const response = await fetch(`${origin}${path}`, {
    headers: cookie ? { cookie } : undefined,
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  })
  assert.ok(response.status >= 300 && response.status < 400, `${path}: status ${response.status}, perlu 3xx`)
  const destination = new URL(response.headers.get("location") ?? "", origin)
  assert.equal(destination.origin, origin, `${path}: redirect harus tetap di aplikasi`)
  assert.equal(destination.pathname, expectedPath, `${path}: redirect harus menuju ${expectedPath}`)
  const body = await response.text()
  assert.equal(/<meta[^>]*http-equiv=["']?refresh/i.test(body), false,
    `${path}: respons tidak boleh memakai meta refresh`)
  if (!cookie) {
    assert.equal(/data-slot=["']sidebar|Navigasi utama/i.test(body), false,
      `${path}: respons anonim tidak boleh memuat shell terlindungi`)
  }
  console.log(`✓ GET ${path} → ${response.status} ${destination.pathname}`)
}

async function checkAllowed(path, cookie, role) {
  const response = await fetch(`${origin}${path}`, {
    headers: { cookie },
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  })
  assert.equal(response.status, 200, `${role} ${path}: perlu 200, diterima ${response.status}`)
  const body = await response.text()
  assert.equal(/<meta[^>]*http-equiv=["']?refresh/i.test(body), false,
    `${role} ${path}: tidak boleh dialihkan lewat meta refresh`)
  console.log(`✓ ${role} GET ${path} → 200`)
}

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

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
const sessionHashes = []
try {
  await waitUntilReady()
  for (const path of protectedRoutes) {
    await checkRedirect(path, null, "/login")
  }

  await client.connect()
  for (const [role, paths] of Object.entries(roleRoutes)) {
    const session = await seededSession(client, role)
    sessionHashes.push(session.tokenHash)
    for (const path of paths) await checkAllowed(path, session.cookie, role)
  }
  const pengguna = await seededSession(client, "pengguna")
  sessionHashes.push(pengguna.tokenHash)
  for (const path of ["/petugas", "/petugas/antrian", "/petugas/pengaturan"]) {
    await checkRedirect(path, pengguna.cookie, "/403")
  }
} finally {
  try {
    if (sessionHashes.length > 0) {
      await client.query('DELETE FROM sessions WHERE "tokenHash" = ANY($1)', [sessionHashes])
    }
  } finally {
    await client.end().catch(() => {})
    if (server.exitCode === null) {
      const exited = once(server, "exit").catch(() => {})
      server.kill()
      await Promise.race([exited, delay(5000)])
      if (server.exitCode === null) server.kill("SIGKILL")
    }
  }
}
