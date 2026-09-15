import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Skeleton } from "@/components/ui/skeleton"

afterEach(cleanup)

describe("Skeleton", () => {
  it("menandai skeleton sebagai presentasional", () => {
    render(<Skeleton data-testid="skeleton" />)

    expect(screen.getByTestId("skeleton")).toHaveAttribute("aria-hidden", "true")
  })

  it("mematikan pulse saat reduced motion aktif", () => {
    render(<Skeleton data-testid="skeleton" />)

    expect(screen.getByTestId("skeleton")).toHaveClass("animate-pulse", "motion-reduce:animate-none")
  })
})
