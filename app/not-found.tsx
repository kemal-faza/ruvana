import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Compass } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "ruvana",
}

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center gap-6 px-5 py-16 text-center sm:px-8">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary-subdued text-primary-subdued-foreground">
        <Compass className="size-6" aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-primary">Halaman tidak ditemukan</p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Alamat ini tidak tersedia.</h1>
      <p className="max-w-md leading-7 text-muted-foreground">Periksa kembali tautannya, atau kembali ke beranda untuk mulai menjelajahi fasilitas kampus.</p>
      <Link href="/" className={buttonVariants({ className: "min-h-12 gap-2 px-6 text-sm" })}>Kembali ke beranda<ArrowRight aria-hidden="true" /></Link>
    </main>
  )
}
