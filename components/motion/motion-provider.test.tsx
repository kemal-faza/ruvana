import { readFileSync } from "node:fs"
import path from "node:path"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const configProps = vi.hoisted(() => ({ reducedMotion: "unset" as string }))

vi.mock("motion/react", () => ({
  MotionConfig: ({
    reducedMotion,
    children,
  }: {
    reducedMotion?: string
    children: React.ReactNode
  }) => {
    configProps.reducedMotion = reducedMotion ?? "unset"
    return <div data-testid="motion-config">{children}</div>
  },
}))

import { MotionProvider } from "@/components/motion/motion-provider"

afterEach(cleanup)

describe("MotionProvider", () => {
  it("memasang MotionConfig dengan reducedMotion user", () => {
    render(
      <MotionProvider>
        <p>Isi halaman</p>
      </MotionProvider>,
    )

    expect(configProps.reducedMotion).toBe("user")
    expect(screen.getByText("Isi halaman")).toBeInTheDocument()
  })

  it("dipasang sebagai anak ThemeProvider di root layout", () => {
    const layout = readFileSync(path.resolve(process.cwd(), "app/layout.tsx"), "utf8")

    const themeIndex = layout.indexOf("<ThemeProvider")
    const motionIndex = layout.indexOf("<MotionProvider")

    expect(themeIndex).toBeGreaterThan(-1)
    expect(motionIndex).toBeGreaterThan(themeIndex)
  })
})
