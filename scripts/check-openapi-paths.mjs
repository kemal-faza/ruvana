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

const indentOf = (line) => line.length - line.trimStart().length
const componentKey = /^ {4}([A-Za-z0-9_.\-]+):\s*$/
const refsIn = (text) =>
  [...text.matchAll(/#\/components\/(schemas|responses|parameters|headers|securitySchemes)\/([A-Za-z0-9_.\-]+)/g)]
    .map((match) => `${match[1]}/${match[2]}`)

/**
 * Komponen yang tidak lagi terjangkau dari `paths` maupun `security`.
 * Rujukan menjalar: komponen mati tidak menghidupkan komponen lain.
 */
function findUnreferencedComponents(source) {
  const lines = source.split(/\r?\n/)
  const componentsStart = lines.findIndex((line) => line === "components:")
  if (componentsStart === -1) throw new Error("Bagian components OpenAPI tidak ditemukan.")

  const bodies = new Map()
  const securitySchemes = new Set()
  let section = null
  let current = null

  for (const line of lines.slice(componentsStart + 1)) {
    if (line.trim() === "") continue
    if (indentOf(line) === 2 && line.trimEnd().endsWith(":")) {
      section = line.trim().slice(0, -1)
      current = null
      continue
    }
    const key = line.match(componentKey)
    if (key && section !== null) {
      current = `${section}/${key[1]}`
      bodies.set(current, [])
      if (section === "securitySchemes") securitySchemes.add(key[1])
      continue
    }
    if (current !== null && indentOf(line) > 4) bodies.get(current).push(line)
  }

  const rootsText = lines.slice(0, componentsStart).join("\n")
  const referenced = new Set()
  const queue = refsIn(rootsText)
  for (const name of securitySchemes) if (rootsText.includes(`${name}: []`)) referenced.add(`securitySchemes/${name}`)

  while (queue.length > 0) {
    const name = queue.pop()
    if (referenced.has(name) || !bodies.has(name)) continue
    referenced.add(name)
    queue.push(...refsIn(bodies.get(name).join("\n")))
  }

  return [...bodies.keys()].filter((name) => !referenced.has(name)).sort()
}

collectRoutes(apiDirectory)
const undocumented = [...implemented].filter((path) => !documented.has(path)).sort()
const missingHandler = [...documented].filter((path) => !implemented.has(path)).sort()
const unreferenced = findUnreferencedComponents(contract)

if (undocumented.length || missingHandler.length || unreferenced.length) {
  if (undocumented.length) console.error("Handler tanpa kontrak:\n" + undocumented.join("\n"))
  if (missingHandler.length) console.error("Kontrak tanpa handler:\n" + missingHandler.join("\n"))
  if (unreferenced.length) console.error("Komponen kontrak tanpa rujukan:\n" + unreferenced.join("\n"))
  process.exitCode = 1
} else {
  console.log(`${implemented.size} path API cocok dengan kontrak OpenAPI.`)
}
