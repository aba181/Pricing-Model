'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Link2, Pencil, TrendingUp } from 'lucide-react'
import { StatusBadge } from '@/components/quotes/StatusBadge'

interface QuoteHeaderProps {
  quoteNumber: string
  clientName: string
  status: string
  createdAt: string
  /** Target for the "Go to P&L" button (e.g. /pnl?quote=12). Defaults to /pnl. */
  pnlHref?: string
  /**
   * Root-relative canonical path to this quote (e.g. /quotes/12). Renders the
   * Share button, which copies the absolute URL. Omit to hide it.
   */
  sharePath?: string
  /** Opens the in-place edit dialog. Omit (e.g. for viewers) to hide Edit. */
  onEdit?: () => void
}

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

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export function QuoteHeader({ quoteNumber, clientName, status, createdAt, pnlHref = '/pnl', sharePath, onEdit }: QuoteHeaderProps) {
  const router = useRouter()
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
  }, [])

  const handleShare = async () => {
    if (!sharePath) return
    // Built from sharePath rather than window.location.href so transient params
    // (?edit=1) never end up in a link someone sends on.
    const url = new URL(sharePath, window.location.origin).toString()
    const ok = await copyText(url)
    setCopyState(ok ? 'copied' : 'error')
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setCopyState('idle'), 2000)
  }

  return (
    <div className="av-panel">
      <div className="av-card-b flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="av-page-title av-num !text-[22px]">
              {quoteNumber}
            </h1>
            <StatusBadge status={status} />
          </div>
          <p style={{ color: 'var(--ink-2)' }}>{clientName}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            Created {formatDate(createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sharePath && (
            <button
              type="button"
              onClick={handleShare}
              className="av-btn av-btn-ghost"
              title={`Copy a link to ${quoteNumber}`}
            >
              {copyState === 'copied' ? <Check size={14} /> : <Link2 size={14} />}
              <span aria-live="polite">{SHARE_LABELS[copyState]}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push('/quotes')}
            className="av-btn av-btn-ghost"
          >
            <ArrowLeft size={14} />
            Back to Quotes
          </button>
          <button
            type="button"
            onClick={() => router.push(pnlHref)}
            className="av-btn av-btn-ghost"
          >
            <TrendingUp size={14} />
            Go to P&amp;L
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="av-btn av-btn-primary"
            >
              <Pencil size={14} />
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
