"use client"

import * as React from "react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "cn"

export const SIDEBAR_COOKIE_NAME = "sidebar_state"
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
export const SIDEBAR_WIDTH = "15rem"
export const SIDEBAR_WIDTH_MOBILE = "18rem"
export const SIDEBAR_WIDTH_ICON = "3rem"
export const SIDEBAR_KEYBOARD_SHORTCUT = "b"

export type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar harus digunakan di dalam SidebarProvider.")
  }

  return context
}

function useSidebarController(
  defaultOpen: boolean,
  openProp: boolean | undefined,
  setOpenProp: ((open: boolean) => void) | undefined,
): SidebarContextProps {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)
  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = isMobile ? openProp ?? _open : true
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      if (!isMobile) return
      const openState = typeof value === "function" ? value(open) : value
      if (setOpenProp) setOpenProp(openState)
      else _setOpen(openState)
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    },
    [isMobile, setOpenProp, open]
  )

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) setOpenMobile((value) => !value)
  }, [isMobile, setOpenMobile])

  const state: SidebarContextProps["state"] = open ? "expanded" : "collapsed"
  return { state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }
}

function useMemoizedSidebarContext({
  state,
  open,
  setOpen,
  isMobile,
  openMobile,
  setOpenMobile,
  toggleSidebar,
}: SidebarContextProps) {
  return React.useMemo(
    () => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  )
}

function SidebarProviderLayout({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-wrapper"
      style={
        {
          "--sidebar-width": SIDEBAR_WIDTH,
          "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        "group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const sidebarController = useSidebarController(defaultOpen, openProp, setOpenProp)
  const contextValue = useMemoizedSidebarContext(sidebarController)

  return (
    <SidebarContext.Provider value={contextValue}>
      <SidebarProviderLayout className={className} style={style} {...props}>
        {children}
      </SidebarProviderLayout>
    </SidebarContext.Provider>
  )
}
