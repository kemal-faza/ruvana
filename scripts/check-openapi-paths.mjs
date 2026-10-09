import { readFileSync, readdirSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

const appDirectory = fileURLToPath(new URL("../app/", import.meta.url))
const apiDirectory = fileURLToPath(new URL("../app/api/", import.meta.url))
const contract = readFileSync(new URL("../docs/api/openapi.yaml", import.meta.url), "utf8")

const pathsSection = contract.match(/^paths:\s*\r?\n([\s\S]*?)(?=^components:)/m)?.[1]
if (!pathsSection) throw new Error("Bagian paths OpenAPI tidak ditemukan.")

const documented = new Set([...pathsSection.matchAll(/^  (\/api\/[^:\r\n]+):\s*$/gm)].map((match) => match[1]))
const implemented = new Set()

function collectRoutes(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      collectRoutes(path)
    } else if (entry.name === "route.ts") {
      const route = relative(appDirectory, path)
        .split(sep).join("/")
        .replace(/\[([^/\]]+)\]/g, "{$1}")
        .replace(/\/route\.ts$/, "")
      implemented.add(`/${route}`)
    }
  }
}

collectRoutes(apiDirectory)
const undocumented = [...implemented].filter((path) => !documented.has(path)).sort()
const missingHandler = [...documented].filter((path) => !implemented.has(path)).sort()

if (undocumented.length || missingHandler.length) {
  if (undocumented.length) console.error("Handler tanpa kontrak:\n" + undocumented.join("\n"))
  if (missingHandler.length) console.error("Kontrak tanpa handler:\n" + missingHandler.join("\n"))
  process.exitCode = 1
} else {
  console.log(`${implemented.size} path API cocok dengan kontrak OpenAPI.`)
}
