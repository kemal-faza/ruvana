import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { Badge, badgeVariants } from "@/components/ui/badge"

const variants = ["pending", "success", "danger", "info", "neutral"] as const

const intentClasses = {
  pending: ["bg-warning-subdued", "text-warning-subdued-foreground"],
  success: ["bg-success-subdued", "text-success-subdued-foreground"],
  danger: ["bg-destructive-subdued", "text-destructive-subdued-foreground"],
  info: ["bg-status-info-surface", "text-status-info-text"],
  neutral: ["bg-status-neutral-surface", "text-status-neutral-text"],
} as const

afterEach(cleanup)

describe("Badge", () => {
  it.each(variants)("merender badge %s dengan teks", (variant) => {
    render(<Badge variant={variant}>{variant}</Badge>)

    expect(screen.getByText(variant)).toBeVisible()
  })

  it.each(variants)("memetakan %s ke intent semantic yang tepat", (variant) => {
    const classes = badgeVariants({ variant })

    for (const className of intentClasses[variant]) {
      expect(classes).toContain(className)
    }
  })
})
