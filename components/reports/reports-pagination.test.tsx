import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, describe, expect, it } from "vitest"

import { ReportsPagination } from "@/components/reports/reports-pagination"

afterEach(cleanup)

function PaginationHarness({ totalPages }: { totalPages: number }) {
  const [page, setPage] = useState(1)

  return <ReportsPagination page={page} totalPages={totalPages} onChange={setPage} />
}

describe("ReportsPagination", () => {
  it("menampilkan indikator ringkas dan nama aksesibel navigasi", () => {
    render(<PaginationHarness totalPages={3} />)

    const navigation = screen.getByRole("navigation", { name: "Navigasi halaman laporan" })
    const previous = screen.getByRole("button", { name: "Sebelumnya" })
    const next = screen.getByRole("button", { name: "Berikutnya" })
    const indicator = screen.getByText("1 / 3")

    expect(indicator).toHaveClass("tabular-nums", "whitespace-nowrap")
    expect(previous).toBeDisabled()
    expect(next).toBeEnabled()
    expect(navigation).toContainElement(indicator)
  })

  it("mengubah indikator dan disabled state pada kedua batas", async () => {
    const user = userEvent.setup()
    render(<PaginationHarness totalPages={3} />)

    const previous = screen.getByRole("button", { name: "Sebelumnya" })
    const next = screen.getByRole("button", { name: "Berikutnya" })
    await user.click(next)
    expect(screen.getByText("2 / 3")).toBeInTheDocument()
    expect(previous).toBeEnabled()
    expect(next).toBeEnabled()

    await user.click(previous)
    expect(screen.getByText("1 / 3")).toBeInTheDocument()
    expect(previous).toBeDisabled()
    expect(next).toBeEnabled()

    await user.click(next)
    await user.click(next)
    expect(screen.getByText("3 / 3")).toBeInTheDocument()
    expect(previous).toBeEnabled()
    expect(next).toBeDisabled()
  })

  it("tidak dirender jika hasil hanya memiliki satu halaman", () => {
    render(<PaginationHarness totalPages={1} />)

    expect(screen.queryByRole("navigation", { name: "Navigasi halaman laporan" })).not.toBeInTheDocument()
  })
})
