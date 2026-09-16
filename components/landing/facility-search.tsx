import { buttonVariants } from "@/components/ui/button"
import { TIPE_FASILITAS, TIPE_FASILITAS_LABEL } from "@/config/business"
import { cn } from "@/lib/utils"

const fieldClass =
  "flex min-h-12 items-center gap-2.5 rounded-control border border-border bg-background px-3.5 text-muted-foreground max-[700px]:px-2.5"

export function FacilitySearch() {
  return (
    <section
      id="pencarian-fasilitas"
      aria-labelledby="pencarian-fasilitas-title"
      className="mx-auto w-full max-w-[1256px] px-4 pt-14 sm:px-7 sm:pt-[72px]"
    >
      <form
        method="get"
        action="/fasilitas"
        className={cn(
          "grid grid-cols-1 items-center gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-subtle",
          "max-[900px]:grid-cols-2 max-[700px]:p-[9px]",
          "min-[901px]:grid-cols-[1.1fr_1fr_1fr_auto]",
        )}
      >
        <h2
          id="pencarian-fasilitas-title"
          className="px-4 text-sm leading-snug font-medium max-[900px]:col-span-2 max-[700px]:px-1.5"
        >
          Cari fasilitas
          <small className="mt-1 block text-xs font-normal text-muted-foreground">
            Mulai dari kegiatanmu
          </small>
        </h2>

        <label className={fieldClass}>
          <span aria-hidden="true">⌘</span>
          <select
            name="tipe"
            aria-label="Pilih tipe fasilitas"
            className="w-full bg-transparent text-xs text-foreground outline-none"
          >
            <option value="">Pilih fasilitas</option>
            {TIPE_FASILITAS.map((tipe) => (
              <option key={tipe} value={tipe}>
                {TIPE_FASILITAS_LABEL[tipe]}
              </option>
            ))}
          </select>
        </label>

        <label className={fieldClass}>
          <span aria-hidden="true">◷</span>
          <input
            type="date"
            name="tanggal"
            aria-label="Pilih tanggal"
            className="w-full bg-transparent text-xs text-foreground outline-none"
          />
        </label>

        <button
          type="submit"
          className={cn(
            buttonVariants(),
            "min-h-12 gap-2 px-5 max-[900px]:col-span-2 max-[900px]:w-full",
          )}
        >
          Jelajahi
          <span aria-hidden="true">↗</span>
        </button>
      </form>
    </section>
  )
}
