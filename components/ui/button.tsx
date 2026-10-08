import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { LoaderCircle } from "lucide-react"

export const BUTTON_ACTION_CLASS = "min-h-11 gap-2.5 px-4 text-sm"

// Panah penanda arah bergeser saat tombol di-hover atau di-fokus keyboard.
// Penandanya `data-motion-icon`, bukan `data-icon`, supaya padding varian size
// Button (`has-data-[icon=inline-end]`) tidak ikut berubah. Durasi, easing, dan
// jarak hanya diambil dari token motion.
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform,translate,opacity] duration-motion-standard ease-motion-emphatic outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 **:data-[motion-icon=inline-end]:transition-transform **:data-[motion-icon=inline-end]:duration-motion-micro **:data-[motion-icon=inline-end]:ease-motion-standard **:data-[motion-icon=inline-end]:group-hover/button:translate-x-motion-xs **:data-[motion-icon=inline-end]:group-focus-visible/button:translate-x-motion-xs",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-hover-foreground",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        danger:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:border-destructive focus-visible:ring-destructive/30",
        soft: "bg-primary-subdued text-primary-subdued-foreground hover:bg-primary-subdued/80",
        "danger-soft":
          "bg-destructive-subdued text-destructive-subdued-foreground hover:bg-destructive-subdued/80 focus-visible:border-destructive focus-visible:ring-destructive/30",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-11",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

/**
 * Render berupa elemen non-`<button>` (mis. `<Link>`) default-nya tidak melewati
 * primitive Base UI: primitive itu memperingatkan bahwa semantik native hilang,
 * sedangkan tautan navigasi harus tetap terbaca dan diuji sebagai link.
 * `nativeButton` yang ditulis eksplisit tetap dihormati, dan `render` berupa
 * `Button` sendiri tetap native karena ia elemen `<button>`.
 */
function rendersNativeElement(render: ButtonPrimitive.Props["render"]): boolean {
  if (render === undefined) return true;
  if (!isValidElement(render)) return true;
  const type = render.type as unknown;
  return type === "button" || type === Button;
}

function Button({
  className,
  children,
  variant = "primary",
  size = "default",
  disabled,
  loading = false,
  render,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean
  }) {
  const classes = cn(buttonVariants({ variant, size, className }))
  const { nativeButton, ...rest } = props
  const isi = loading ? (
    <>
      <span className="opacity-0">{children}</span>
      <LoaderCircle
        aria-hidden="true"
        className="absolute size-4 animate-spin motion-reduce:animate-none"
      />
    </>
  ) : (
    children
  )

  if (!rendersNativeElement(render) && nativeButton === undefined) {
    const element = render as ReactElement<{
      className?: string
      children?: ReactNode
      onClick?: (event: { preventDefault: () => void }) => void
    }>
    const {
      className: renderClass,
      children: renderChildren,
      ...elementProps
    } = element.props

    // Elemen non-`<button>` tidak mengenal atribut `disabled`, jadi keadaan
    // nonaktif harus dibawa lewat `aria-disabled`, aksi yang dibatalkan, dan
    // kelas visual — kalau tidak, tombol tautan tetap bisa diklik saat loading.
    const nonaktif = Boolean(disabled || loading)
    const aksiAsli = elementProps.onClick ?? (rest.onClick as typeof elementProps.onClick)

    return cloneElement(
      element,
      {
        ...rest,
        ...elementProps,
        "data-slot": "button",
        className: cn(classes, renderClass, nonaktif && "pointer-events-none opacity-50"),
        "aria-busy": loading || undefined,
        "aria-disabled": nonaktif || undefined,
        onClick: nonaktif
          ? (event: { preventDefault: () => void }) => event.preventDefault()
          : aksiAsli,
      } as never,
      renderChildren ?? isi,
    )
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      className={classes}
      {...rest}
      render={render}
      nativeButton={nativeButton ?? true}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {isi}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
