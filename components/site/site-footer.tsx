import Link from "next/link"

const footerLinks = [
  { label: "Beranda", href: "/" },
  { label: "Fasilitas", href: "/fasilitas" },
  { label: "Jadwal", href: "#jadwal" },
  { label: "Kebijakan Privasi", href: "/kebijakan-privasi" },
  { label: "Syarat & Ketentuan", href: "/syarat-ketentuan" },
] as const

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto w-full max-w-[1256px] px-4 pt-14 pb-6 sm:px-7 sm:pt-[84px]">
        <div className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/"
              aria-label="Ruvana — beranda, footer"
              className="inline-flex items-center text-lg font-semibold tracking-tight"
            >
              ruvana
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">
              Ruang bersama, kegiatan lebih bermakna.
            </p>
          </div>

          <nav
            aria-label="Navigasi footer"
            className="flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted-foreground"
          >
            {footerLinks.map(({ label, href }) => (
              <Link key={href} href={href} className="transition-colors hover:text-foreground">
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 pt-4 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <span>© 2026 Ruvana. Semua kemungkinan, dimulai di kampus.</span>
          <span className="opacity-80">Foto: Unsplash</span>
        </div>
      </div>
    </footer>
  )
}
