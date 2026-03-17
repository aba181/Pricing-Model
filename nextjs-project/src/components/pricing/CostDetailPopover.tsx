'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { fmt } from '@/lib/format'

export interface BreakdownItem {
  label: string
  value: number
  formula?: string
}

export interface ParamItem {
  label: string
  value: number
  decimals?: number
}

interface LineDetailPopoverProps {
  title: string
  monthLabel: string
  items: BreakdownItem[]
  params?: ParamItem[]
  anchorRect: DOMRect
  onClose: () => void
}

export function LineDetailPopover({
  title,
  monthLabel,
  items,
  params,
  anchorRect,
  onClose,
}: LineDetailPopoverProps) {
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

  const total = items.reduce((s, i) => s + i.value, 0)

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
          {title}
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

      {/* Breakdown items */}
      <div className="px-3 py-2 space-y-1.5">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">{item.label}</span>
              <span className="font-mono text-gray-900 dark:text-gray-100">{fmt(item.value, 0)}</span>
            </div>
            {item.formula && (
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono pl-2 mt-0.5">
                {item.formula}
              </div>
            )}
          </div>
        ))}

        <div className="border-t border-gray-200 dark:border-gray-700 pt-1.5 flex justify-between items-center font-semibold">
          <span className="text-gray-900 dark:text-gray-100">Total</span>
          <span className="font-mono text-gray-900 dark:text-gray-100">{fmt(total, 0)}</span>
        </div>
      </div>

      {/* Parameters */}
      {params && params.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
          <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Parameters</div>
          <div className={`grid gap-2 text-[11px] ${params.length <= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {params.map((p) => (
              <div key={p.label}>
                <span className="text-gray-500 dark:text-gray-400">{p.label}</span>
                <span className="ml-1 font-mono text-gray-800 dark:text-gray-200">
                  {fmt(p.value, p.decimals ?? 1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
