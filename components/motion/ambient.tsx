import { cn } from "@/lib/utils"

export type AmbientPattern = "float" | "drift" | "sweep" | "shimmer"
export type AmbientIntensity = "subtle" | "medium" | "strong"

interface AmbientProps {
  children: React.ReactNode
  pattern?: AmbientPattern
  intensity?: AmbientIntensity
  className?: string
}

/**
 * Loop dekoratif murni CSS: berjalan sebelum hidrasi, tanpa biaya main thread,
 * dan berhenti otomatis lewat blok prefers-reduced-motion di app/globals.css.
 * Karena tidak memakai hook, komponen ini tetap server component.
 */
export function Ambient({
  children,
  pattern = "float",
  intensity = "subtle",
  className,
}: AmbientProps) {
  return (
    <div
      data-motion-ambient="true"
      className={cn("ambient", `ambient-${pattern}`, `ambient-${intensity}`, className)}
    >
      {children}
    </div>
  )
}
