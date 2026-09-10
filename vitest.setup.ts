import "@testing-library/jest-dom/vitest"

const mediaState = new Map<string, boolean>()
const mediaLists = new Map<string, Set<MediaQueryList>>()
type MediaListener = (event: MediaQueryListEvent) => void
const mediaListeners = new Map<string, Set<MediaListener>>()

export function setMatchMedia(query: string, matches: boolean) {
  mediaState.set(query, matches)
  mediaLists.get(query)?.forEach((mediaList) => {
    Object.defineProperty(mediaList, "matches", { configurable: true, value: matches })
  })
  const event = { matches, media: query } as MediaQueryListEvent
  mediaListeners.get(query)?.forEach((listener) => listener(event))
}

export function resetMatchMedia() {
  mediaState.clear()
  mediaLists.clear()
  mediaListeners.clear()
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList => {
    const listeners = mediaListeners.get(query) ?? new Set<MediaListener>()
    mediaListeners.set(query, listeners)
    const mediaList = {
      matches: mediaState.get(query) ?? false,
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject | null) => {
        if (typeof listener === "function") listeners.add(listener as MediaListener)
      },
      removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject | null) => {
        if (typeof listener === "function") listeners.delete(listener as MediaListener)
      },
      addListener: (listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null) => {
        if (listener) listeners.add(listener as MediaListener)
      },
      removeListener: (listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null) => {
        if (listener) listeners.delete(listener as MediaListener)
      },
      dispatchEvent: () => true,
    } as MediaQueryList
    const lists = mediaLists.get(query) ?? new Set()
    lists.add(mediaList)
    mediaLists.set(query, lists)
    return mediaList
  },
})
