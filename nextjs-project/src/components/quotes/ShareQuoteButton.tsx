'use client'

import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Check, Link2 } from 'lucide-react'

type CopyState = 'idle' | 'copied' | 'error'

const SHARE_LABELS: Record<CopyState, string> = {
  idle: 'Share',
  copied: 'Copied',
  error: 'Copy failed',
}

/**
 * navigator.clipboard is only available in a secure context, so fall back to the
 * legacy selection trick — that keeps Share working on a plain-http dev host.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Permission denied or no clipboard — try the fallback below.
  }
  try {
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.top = '0'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(field)
    return ok
  } catch {
    return false
  }
}

interface ShareQuoteButtonProps {
  /** Root-relative canonical path to the quote (e.g. /quotes/12). */
  sharePath: string
  /** Quote number — used for the tooltip and the accessible label. */
  quoteNumber: string
  /** 'button' = labelled ghost button (detail header); 'icon' = bare icon (list rows). */
  variant?: 'button' | 'icon'
  /** Overrides the icon-variant class list (mobile rows use bigger touch targets). */
  className?: string
  style?: CSSProperties
  iconSize?: number
}

/**
 * Copies the absolute URL of a quote to the clipboard. Shared by the quote
 * detail header and the quotes table so both produce the identical link.
 */
export function ShareQuoteButton({
  sharePath,
  quoteNumber,
  variant = 'button',
  className,
  style,
  iconSize,
}: ShareQuoteButtonProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
  }, [])

  const handleShare = async () => {
    // Built from sharePath rather than window.location.href so transient params
    // (?edit=1) never end up in a link someone sends on.
    const url = new URL(sharePath, window.location.origin).toString()
    const ok = await copyText(url)
    setCopyState(ok ? 'copied' : 'error')
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setCopyState('idle'), 2000)
  }

  const title =
    copyState === 'idle' ? `Copy a link to ${quoteNumber}` : SHARE_LABELS[copyState]

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleShare}
        title={title}
        aria-label={`Copy a link to ${quoteNumber}`}
        className={className ?? 'p-1 rounded transition-colors'}
        style={{ color: copyState === 'copied' ? 'var(--pos)' : 'var(--muted)', ...style }}
      >
        {copyState === 'copied' ? <Check size={iconSize ?? 14} /> : <Link2 size={iconSize ?? 14} />}
        <span className="sr-only" aria-live="polite">{SHARE_LABELS[copyState]}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="av-btn av-btn-ghost"
      title={`Copy a link to ${quoteNumber}`}
    >
      {copyState === 'copied' ? <Check size={14} /> : <Link2 size={14} />}
      <span aria-live="polite">{SHARE_LABELS[copyState]}</span>
    </button>
  )
}
