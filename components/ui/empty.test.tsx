import { Inbox } from "lucide-react"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

afterEach(cleanup)

describe("Empty", () => {
  it("mengomposisikan judul, deskripsi, ikon dekoratif, dan aksi", () => {
    render(
      <Empty>
        <EmptyHeader>
          <EmptyMedia data-testid="empty-icon" variant="icon">
            <Inbox aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Belum ada data</EmptyTitle>
          <EmptyDescription>Coba lagi nanti.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button>Muat ulang</Button>
        </EmptyContent>
      </Empty>,
    )

    expect(screen.getByText("Belum ada data")).toBeInTheDocument()
    expect(screen.getByText("Coba lagi nanti.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Muat ulang" })).toBeEnabled()
    expect(screen.getByTestId("empty-icon")).toHaveAttribute("data-variant", "icon")
  })
})
