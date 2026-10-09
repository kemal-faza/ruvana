import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { SkipToContentLink } from "./skip-to-content-link"

describe("SkipToContentLink", () => {
  it("memindahkan fokus ke konten utama saat diaktifkan", async () => {
    const user = userEvent.setup()
    render(
      <>
        <SkipToContentLink />
        <main id="konten" tabIndex={-1}>Konten</main>
      </>,
    )

    await user.click(screen.getByRole("link", { name: "Lewati ke konten utama" }))

    expect(screen.getByRole("main")).toHaveFocus()
  })
})
