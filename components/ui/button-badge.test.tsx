import { describe, expect, it } from "vitest"

import { badgeVariants } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"

describe("kontras hover aksi utama", () => {
  it("memakai token hover semantic pada Button utama", () => {
    const classes = buttonVariants({ variant: "default" })

    expect(classes).toContain("hover:bg-primary-hover")
    expect(classes).not.toContain("hover:bg-primary/80")
  })

  it("memakai token hover semantic pada Badge utama yang dapat diklik", () => {
    const classes = badgeVariants({ variant: "default" })

    expect(classes).toContain("[a]:hover:bg-primary-hover")
    expect(classes).not.toContain("[a]:hover:bg-primary/80")
  })
})
