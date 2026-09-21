import Link from "next/link"
import { SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export default function FasilitasNotFound() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Fasilitas tidak ditemukan</EmptyTitle>
        <EmptyContent>
          <EmptyDescription>
            Fasilitas yang Anda cari tidak tersedia atau sudah tidak aktif.
          </EmptyDescription>
        </EmptyContent>
      </EmptyHeader>
      <Button className="min-h-11" nativeButton={false} render={<Link href="/fasilitas" />}>
        Kembali ke daftar fasilitas
      </Button>
    </Empty>
  )
}
