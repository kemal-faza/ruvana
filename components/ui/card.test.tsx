import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

afterEach(() => {
  cleanup()
})

describe("kontrak Card", () => {
  it("merender region card opsional tanpa membuat card interaktif", () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Ringkasan</CardTitle>
        </CardHeader>
        <CardContent>Isi</CardContent>
        <CardFooter>Aksi</CardFooter>
      </Card>,
    )

    expect(screen.getByText("Ringkasan")).toBeInTheDocument()
    expect(screen.getByTestId("card")).toHaveClass(
      "rounded-card",
      "border-border",
      "p-6",
      "shadow-subtle",
    )
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
