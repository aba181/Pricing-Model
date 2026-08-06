'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 767px)'

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

/**
 * Returns true when viewport width is below the md breakpoint (< 768px).
 *
 * useSyncExternalStore keeps this hydration-safe: the server snapshot is
 * false (desktop markup), and React swaps to the real matchMedia value
 * immediately after hydration — no server/client HTML mismatch.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}
