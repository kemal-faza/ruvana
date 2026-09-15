import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Ambient } from "@/components/motion/ambient"

afterEach(cleanup)

describe("Ambient", () => {
  it("menandai node sebagai motion berkelanjutan", () => {
    render(
      <Ambient>
        <p>Kartu mengapung</p>
      </Ambient>,
    )

    const node = screen.getByText("Kartu mengapung").closest("[data-motion-ambient]")
    expect(node).not.toBeNull()
    expect(node).toHaveAttribute("data-motion-ambient", "true")
  })

  it("memakai pola dan intensitas default", () => {
    render(
      <Ambient>
        <p>Default</p>
      </Ambient>,
    )

    const node = screen.getByText("Default").closest("[data-motion-ambient]")
    expect(node?.className).toContain("ambient")
    expect(node?.className).toContain("ambient-float")
    expect(node?.className).toContain("ambient-subtle")
  })

  it("menerima pola dan intensitas lain", () => {
    render(
      <Ambient pattern="sweep" intensity="strong" className="rounded-3xl">
        <p>Gradasi bergerak</p>
      </Ambient>,
    )

    const node = screen.getByText("Gradasi bergerak").closest("[data-motion-ambient]")
    expect(node?.className).toContain("ambient-sweep")
    expect(node?.className).toContain("ambient-strong")
    expect(node?.className).toContain("rounded-3xl")
  })
})
