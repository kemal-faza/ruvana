import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

afterEach(() => {
  cleanup()
})

describe("kontrak Field dan Input", () => {
  it("menghubungkan bantuan dan error ke input", () => {
    render(
      <Field data-invalid>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" aria-invalid aria-describedby="email-description email-error" />
        <FieldDescription id="email-description">Gunakan email kampus.</FieldDescription>
        <FieldError id="email-error">Email tidak valid.</FieldError>
      </Field>,
    )

    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "Gunakan email kampus. Email tidak valid.",
    )
  })

  it("meneruskan status required ke input berlabel", () => {
    render(
      <Field>
        <FieldLabel htmlFor="nama">Nama</FieldLabel>
        <Input id="nama" required />
      </Field>,
    )

    expect(screen.getByRole("textbox", { name: "Nama" })).toBeRequired()
  })

  it("menyediakan API indikator wajib yang terlihat dan dapat diakses", () => {
    render(
      <Field>
        <FieldLabel htmlFor="wajib" required>
          Nama
        </FieldLabel>
        <Input id="wajib" required />
      </Field>,
    )

    expect(screen.getByRole("textbox", { name: "Nama (wajib)" })).toBeRequired()
    expect(screen.getByText("*", { selector: "span" })).toBeVisible()
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByText("(wajib)", { selector: ".sr-only" })).toBeInTheDocument()
  })

  it("memberi penanda nonwarna untuk input yang tidak valid", () => {
    render(
      <Field data-invalid>
        <FieldLabel htmlFor="email-invalid">Email</FieldLabel>
        <Input id="email-invalid" aria-invalid />
      </Field>,
    )

    expect(screen.getByRole("textbox")).toHaveClass("aria-invalid:border-dashed")
    expect(screen.getByRole("group")).toHaveClass("data-invalid:border-l-2")
  })
})
