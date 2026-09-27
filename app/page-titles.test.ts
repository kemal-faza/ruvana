import { describe, expect, it } from "vitest"

import { metadata as adminAnalitikMetadata } from "@/app/admin/analitik/page"
import { metadata as adminLayoutMetadata } from "@/app/admin/layout"
import { metadata as daftarMetadata } from "@/app/daftar/page"
import { metadata as loginMetadata } from "@/app/login/page"

describe("separator title metadata", () => {
  it("memakai pipe, bukan em dash", () => {
    expect(loginMetadata.title).toBe("Masuk | Ruvana")
    expect(daftarMetadata.title).toBe("Daftar | Ruvana")
    expect(adminLayoutMetadata.title).toBe("Admin | Ruvana")
    expect(adminAnalitikMetadata.title).toBe("Analitik | Ruvana")
  })
})
