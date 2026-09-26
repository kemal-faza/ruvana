"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { cn } from "cn"
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

const Combobox = ComboboxPrimitive.Root

function ComboboxInput({
  className,
  children,
  triggerLabel = "Buka daftar pilihan",
  ...props
}: ComboboxPrimitive.Input.Props & { triggerLabel?: string }) {
  return (
    <div className="group/combobox-field relative w-full min-w-0">
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        className={cn(
          "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 pr-11 text-base font-normal outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm",
          className
        )}
        {...props}
      />
      <ComboboxPrimitive.Trigger
        data-slot="combobox-trigger"
        render={<Button type="button" variant="ghost" size="icon-sm" aria-label={triggerLabel} />}
        className="absolute inset-y-0.5 right-0.5 h-auto min-w-10 rounded-lg group-has-data-[slot=combobox-clear]/combobox-field:hidden"
      >
        <ChevronDownIcon aria-hidden="true" className="size-4 text-muted-foreground" />
      </ComboboxPrimitive.Trigger>
      {children}
    </div>
  )
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<Button type="button" variant="ghost" size="icon-sm" />}
      className={cn("absolute inset-y-0.5 right-0.5 h-auto min-w-10 rounded-lg", className)}
      {...props}
    >
      <XIcon aria-hidden="true" className="size-4" />
    </ComboboxPrimitive.Clear>
  )
}

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 4,
  align = "start",
  alignOffset = 0,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<ComboboxPrimitive.Positioner.Props, "side" | "align" | "sideOffset" | "alignOffset">) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        "max-h-72 scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0",
        className
      )}
      {...props}
    />
  )
}

function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex min-h-9 w-full cursor-default items-center gap-1.5 rounded-md py-2 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon aria-hidden="true" className="pointer-events-none" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn("py-3 text-center text-sm text-muted-foreground empty:p-0", className)}
      {...props}
    />
  )
}

export {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
}
