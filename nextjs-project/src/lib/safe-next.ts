/**
 * Post-login redirect targets ("where was this person headed before we bounced
 * them to the login screen?") arrive from the `?next=` query string and from the
 * OAuth `state` round-trip. Both are attacker-controllable, so only same-origin
 * root-relative paths are ever honoured — anything else falls back to the
 * dashboard rather than becoming an open redirect.
 */

export const DEFAULT_NEXT = '/dashboard'

const BACKSLASH = String.fromCharCode(92)

export function sanitizeNext(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_NEXT

  // Must be root-relative. `//host` and a backslash equivalent are
  // protocol-relative URLs the browser happily follows off-origin.
  if (!raw.startsWith('/')) return DEFAULT_NEXT
  if (raw.startsWith('//')) return DEFAULT_NEXT

  // Backslashes and control characters can still be normalised into an
  // authority component by some browsers.
  if (raw.includes(BACKSLASH)) return DEFAULT_NEXT
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i)
    if (code < 32 || code === 127) return DEFAULT_NEXT
  }

  // Sending someone back to /login would loop them straight back here.
  if (raw === '/login' || raw.startsWith('/login?')) return DEFAULT_NEXT

  return raw
}
