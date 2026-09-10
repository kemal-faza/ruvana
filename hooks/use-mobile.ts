import * as React from "react"

const MOBILE_QUERY = "(max-width: 1023px)"

export function useIsMobile() {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY)
    mediaQuery.addEventListener("change", onStoreChange)
    return () => mediaQuery.removeEventListener("change", onStoreChange)
  }, [])

  const getSnapshot = React.useCallback(() => window.matchMedia(MOBILE_QUERY).matches, [])
  const getServerSnapshot = React.useCallback(() => false, [])

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
