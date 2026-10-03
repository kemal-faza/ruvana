import type { ReactNode } from "react"

import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"

export default function PublicFacilityLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader current="fasilitas" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <SiteFooter />
    </>
  )
}
