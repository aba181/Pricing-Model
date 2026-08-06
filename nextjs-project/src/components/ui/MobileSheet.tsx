'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useIsMobile } from '@/lib/hooks/useIsMobile'

export interface MobileSheetProps {
  isOpen: boolean
  onClose: () => void
  /** Rendered in the header (desktop: inside .av-panel-h h2). */
  title: React.ReactNode
  /** Scrollable body — children keep their own padding (e.g. .av-card-b). */
  children: React.ReactNode
  /**
   * Optional pinned footer for primary actions. On mobile it stays visible
   * above the safe area while the body scrolls; submit buttons placed here
   * reach their form via the HTML form="…" attribute.
   */
  footer?: React.ReactNode
  /** Desktop width class. Default: 'max-w-md'. */
  maxWidth?: string
  /** Optional data-dialog attribute (kept from the legacy dialogs). */
  dataDialog?: string
  /** Tap on the scrim closes. Default true; form dialogs pass false so a
   *  stray tap can't discard half-entered input. */
  closeOnScrim?: boolean
  /** Escape closes. Default true; pass false to keep a custom handler
   *  (e.g. NewQuoteModal's nested-dialog guard). */
  escapeCloses?: boolean
  /** Mobile: near-full-height sheet (92dvh) instead of content-sized. */
  fullScreen?: boolean
  /** Desktop panel class override (default `w-full ${maxWidth}`). */
  desktopClassName?: string
  /** Desktop panel style override (merged over the default). */
  desktopStyle?: React.CSSProperties
}

/**
 * Responsive dialog shell (pattern from asset-app's MobileSheet).
 *
 * Below md: bottom sheet — slide-up animation (skipped under
 * prefers-reduced-motion via .av-sheet-up), drag handle with
 * swipe-down-to-dismiss (displacement + velocity threshold), 85dvh cap,
 * safe-area padding, scrim tap + Escape to close.
 * At md+: the app's existing centered dialog presentation, unchanged.
 */
export function MobileSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-md',
  dataDialog,
  closeOnScrim = true,
  escapeCloses = true,
  fullScreen = false,
  desktopClassName,
  desktopStyle,
}: MobileSheetProps) {
  const isMobile = useIsMobile()

  // Escape closes in both presentations.
  useEffect(() => {
    if (!isOpen || !escapeCloses) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, escapeCloses, onClose])

  if (!isOpen) return null

  if (isMobile) {
    // The sheet body is a separate component so its drag state mounts fresh
    // every time the sheet opens (no stale-drag reset effect needed).
    return (
      <BottomSheet
        onClose={onClose}
        title={title}
        footer={footer}
        dataDialog={dataDialog}
        closeOnScrim={closeOnScrim}
        fullScreen={fullScreen}
      >
        {children}
      </BottomSheet>
    )
  }

  // ── md+: the app's existing centered dialog, unchanged ────────────────────
  return (
    <div
      data-dialog={dataDialog}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={closeOnScrim ? (e) => e.target === e.currentTarget && onClose() : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`av-panel flex flex-col ${desktopClassName ?? `w-full ${maxWidth}`}`}
        style={{ boxShadow: '0 20px 50px rgba(0,0,0,.3)', maxHeight: '85dvh', ...desktopStyle }}
      >
        <div className="av-panel-h shrink-0">
          <h2>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div
            className="shrink-0 px-[18px] py-3"
            style={{ borderTop: '1px solid var(--line-2)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Mobile bottom sheet (mounts only while open) ─────────────────────────────

interface BottomSheetProps {
  onClose: () => void
  title: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  dataDialog?: string
  closeOnScrim: boolean
  fullScreen: boolean
}

function BottomSheet({
  onClose,
  title,
  children,
  footer,
  dataDialog,
  closeOnScrim,
  fullScreen,
}: BottomSheetProps) {
  const drag = useRef<{ startY: number; startT: number } | null>(null)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)

  // Swipe-down-to-dismiss on the drag handle + header.
  const onPointerDown = (e: React.PointerEvent) => {
    // Taps on the header's buttons (the ✕) must stay clicks — capturing the
    // pointer here would retarget pointerup away from the button, swallow its
    // click, and leave the sheet stuck open with the scrim eating all input.
    if ((e.target as HTMLElement).closest('button')) return
    drag.current = { startY: e.clientY, startT: performance.now() }
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setDragY(Math.max(0, e.clientY - drag.current.startY))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current) return
    const dy = e.clientY - drag.current.startY
    const dt = performance.now() - drag.current.startT
    const velocity = dy / Math.max(dt, 1) // px per ms
    drag.current = null
    setDragging(false)
    setDragY(0)
    if (dy > 80 || (dy > 24 && velocity > 0.5)) onClose()
  }
  const dragHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  }

  return (
    <div data-dialog={dataDialog} className="fixed inset-0 z-[60]">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={closeOnScrim ? onClose : undefined}
      />
      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        className="absolute bottom-0 inset-x-0 rounded-t-2xl av-sheet-up flex flex-col"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderBottom: 'none',
          ...(fullScreen ? { height: '92dvh' } : { maxHeight: '85dvh' }),
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? 'none' : 'transform .2s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-2 pb-1 touch-manip"
          style={{ touchAction: 'none', cursor: 'grab' }}
          aria-label="Drag down to dismiss"
          {...dragHandlers}
        >
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--line)' }} />
        </div>
        {/* Header */}
        <div
          className="flex items-center justify-between shrink-0 px-[18px] pb-3"
          style={{ borderBottom: '1px solid var(--line-2)', touchAction: 'none' }}
          {...dragHandlers}
        >
          <h2
            className="text-[11px] tracking-[0.12em] uppercase font-bold"
            style={{ color: 'var(--muted)' }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid place-items-center w-11 h-11 -m-2 touch-manip"
            style={{ color: 'var(--muted)' }}
          >
            <X size={20} />
          </button>
        </div>
        {/* Body */}
        <div
          className="overflow-y-auto flex-1"
          style={footer ? undefined : { paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
        >
          {children}
        </div>
        {/* Pinned footer */}
        {footer && (
          <div
            className="shrink-0 px-[18px] pt-3 safe-pb"
            style={{
              borderTop: '1px solid var(--line-2)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
