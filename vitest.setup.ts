import "@testing-library/jest-dom/vitest"

// jsdom belum menyediakan IntersectionObserver; Motion memakainya untuk animasi viewport.
class IntersectionObserverStub implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin = ""
  readonly scrollMargin = ""
  readonly thresholds: ReadonlyArray<number> = []
  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  unobserve() {}
}

Object.defineProperty(globalThis, "IntersectionObserver", {
  writable: true,
  value: IntersectionObserverStub,
})

// ResizeObserver belum ada di jsdom. Motion memakainya untuk mengukur elemen
// saat mengamati ukuran; stub ini menjaga komponen berbasis ukuran tetap aman.
class ResizeObserverStub implements ResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: ResizeObserverStub,
})

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

if (typeof window !== "undefined") {
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
}
