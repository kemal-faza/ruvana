import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIPE_FASILITAS, TIPE_FASILITAS_LABEL } from "@/config/business";
import { cn } from "@/lib/utils";

// Placeholder "Pilih fasilitas" ditampilkan lewat `SelectValue` di trigger, bukan
// sebagai item, supaya tidak ikut terpilih sebagai tipe.
const tipeOptions: { value: string; label: string }[] = TIPE_FASILITAS.map(
  (tipe) => ({
    value: tipe,
    label: TIPE_FASILITAS_LABEL[tipe],
  }),
);

// Kontrol di dalam field memakai `outline-none`, jadi indikator fokus dipindahkan
// ke pembungkusnya: satu ring menandai seluruh kontrol gabungan saat fokus masuk.
const fieldClass =
  "flex min-h-12 items-center gap-2.5 rounded-control border border-border bg-background px-3.5 text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 max-md:px-2.5";

export function FacilitySearch() {
  return (
    <section
      id="pencarian-fasilitas"
      aria-labelledby="pencarian-fasilitas-title"
      className="mx-auto w-full max-w-shell px-4 pt-14 sm:px-7 sm:pt-search-top-lg"
    >
      <form
        method="get"
        action="/fasilitas"
        className={cn(
          "grid grid-cols-1 items-center gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-subtle",
          "max-lg:grid-cols-2 max-md:p-search-inset",
          "lg:grid-cols-[1.1fr_1fr_1fr_auto]",
        )}
      >
        <h2
          id="pencarian-fasilitas-title"
          className="px-4 text-sm/snug font-medium max-lg:col-span-2 max-md:px-1.5"
        >
          Cari fasilitas
          <small className="mt-1 block text-xs font-normal text-muted-foreground">
            Mulai dari kegiatanmu
          </small>
        </h2>

        <div data-slot="search-field" className={fieldClass}>
          <span aria-hidden="true">⌘</span>
          {/* `modal={false}` mencegah Base UI mengunci scroll halaman. Kunci itu menulis
              `overflow: hidden` ke scroller viewport sehingga scrollbar hilang, dan karena
              tipografi landing page memakai `vw`, ukuran font ikut berubah. */}
          <Select name="tipe" items={tipeOptions} modal={false}>
            <SelectTrigger
              aria-label="Pilih tipe fasilitas"
              className="h-auto min-h-12 w-full border-0 bg-transparent p-0 text-xs text-foreground focus-visible:border-0 focus-visible:ring-0 data-[size=default]:h-auto dark:bg-transparent dark:hover:bg-transparent cursor-pointer"
            >
              <SelectValue placeholder="Pilih fasilitas" />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              <SelectGroup>
                {tipeOptions.map((tipe) => (
                  <SelectItem key={tipe.value} value={tipe.value}>
                    {tipe.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div data-slot="search-field" className={fieldClass}>
          <DatePicker name="tanggal" aria-label="Pilih tanggal" />
        </div>

        <button
          type="submit"
          className={cn(
            buttonVariants(),
            "min-h-12 gap-2 px-5 max-lg:col-span-2 max-lg:w-full cursor-pointer",
          )}
        >
          Jelajahi
          <ArrowRight
            aria-hidden="true"
            data-motion-icon="inline-end"
            className="size-5"
          />
        </button>
      </form>
    </section>
  );
}
