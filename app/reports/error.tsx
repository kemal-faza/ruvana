"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"

export default function ReportsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Gagal memuat laporan</EmptyTitle>
        <EmptyContent>
          <EmptyDescription>Terjadi kesalahan saat memuat data laporan. Silakan coba lagi.</EmptyDescription>
        </EmptyContent>
      </EmptyHeader>
      <Button className="min-h-11" onClick={() => reset()}>
        Coba lagi
      </Button>
    </Empty>
  )
}