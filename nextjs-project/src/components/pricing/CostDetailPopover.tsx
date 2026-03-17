'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { fmt } from '@/lib/format'

interface CostDetailPopoverProps {
  /** Month label (e.g., "Mar 2026") */
  monthLabel: string
  /** Sub-component values for the selected month */
  eprMr: number
  llpMr: number
  apuMr: number
  /** KPI values for the selected month */
  fh: number
  fc: number
  apuFh: number
  /** Position anchor */
  anchorRect: DOMRect
  onClose: () => void
}

export function CostDetailPopover({
  monthLabel,
  eprMr,
  llpMr,
  apuMr,
  fh,
  fc,
  apuFh,
  anchorRect,
  onClose,
}: CostDetailPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const total = eprMr + llpMr + apuMr

  // Position below the clicked cell
  const top = anchorRect.bottom + 4
  const left = Math.max(8, anchorRect.left - 120)

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl w-[320px] text-xs"
      style={{ top, left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          Maint. Reserves - Variable
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Month label */}
      <div className="px-3 py-1.5 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
        {monthLabel}
      </div>

      {/* Breakdown table */}
      <div className="px-3 py-2 space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">EPR</span>
          <span className="font-mono text-gray-900 dark:text-gray-100">{fmt(eprMr, 0)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">LLP</span>
          <span className="font-mono text-gray-900 dark:text-gray-100">{fmt(llpMr, 0)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-300">APU</span>
          <span className="font-mono text-gray-900 dark:text-gray-100">{fmt(apuMr, 0)}</span>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-1.5 flex justify-between items-center font-semibold">
          <span className="text-gray-900 dark:text-gray-100">Total</span>
          <span className="font-mono text-gray-900 dark:text-gray-100">{fmt(total, 0)}</span>
        </div>
      </div>

      {/* Parameters */}
      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
        <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Parameters</div>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <span className="text-gray-500 dark:text-gray-400">FH</span>
            <span className="ml-1 font-mono text-gray-800 dark:text-gray-200">{fmt(fh, 1)}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">FC</span>
            <span className="ml-1 font-mono text-gray-800 dark:text-gray-200">{fmt(fc, 1)}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">APU FH</span>
            <span className="ml-1 font-mono text-gray-800 dark:text-gray-200">{fmt(apuFh, 1)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
