'use client'

import { X } from 'lucide-react'
import type { MsnInput } from '@/stores/pricing-store'

interface MsnInputRowProps {
  input: MsnInput
  onUpdate: (msn: number, field: keyof MsnInput, value: string | number) => void
  onRemove: (msn: number) => void
}

export function MsnInputRow({ input, onUpdate, onRemove }: MsnInputRowProps) {
  return (
    <div className="grid grid-cols-[80px_70px_90px_100px_90px_80px_120px_120px_100px_80px_110px_40px] gap-2 items-center py-2 px-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
      {/* Read-only fields */}
      <div className="text-sm text-gray-100 font-medium">{input.msn}</div>
      <div className="text-sm text-gray-400">{input.aircraftType}</div>
      <div className="text-sm text-gray-400 truncate">
        {input.registration ?? '-'}
      </div>

      {/* MGH */}
      <input
        type="number"
        step="0.01"
        value={input.mgh}
        onChange={(e) => onUpdate(input.msn, 'mgh', e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
        aria-label={`MGH for MSN ${input.msn}`}
      />

      {/* Cycle Ratio */}
      <input
        type="number"
        step="0.0001"
        value={input.cycleRatio}
        onChange={(e) => onUpdate(input.msn, 'cycleRatio', e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
        aria-label={`Cycle Ratio for MSN ${input.msn}`}
      />

      {/* Environment */}
      <select
        value={input.environment}
        onChange={(e) => onUpdate(input.msn, 'environment', e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded px-1 py-1 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
        aria-label={`Environment for MSN ${input.msn}`}
      >
        <option value="benign">Benign</option>
        <option value="hot">Hot</option>
      </select>

      {/* Period Start (month-year) */}
      <input
        type="month"
        value={input.periodStart}
        onChange={(e) => onUpdate(input.msn, 'periodStart', e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
        aria-label={`Period Start for MSN ${input.msn}`}
      />

      {/* Period End (month-year) */}
      <input
        type="month"
        value={input.periodEnd}
        onChange={(e) => onUpdate(input.msn, 'periodEnd', e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
        aria-label={`Period End for MSN ${input.msn}`}
      />

      {/* Lease Type */}
      <select
        value={input.leaseType}
        onChange={(e) => onUpdate(input.msn, 'leaseType', e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded px-1 py-1 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
        aria-label={`Lease Type for MSN ${input.msn}`}
      >
        <option value="wet">Wet</option>
        <option value="damp">Damp</option>
        <option value="moist">Moist</option>
      </select>

      {/* Crew Sets */}
      <input
        type="number"
        min={1}
        value={input.crewSets}
        onChange={(e) =>
          onUpdate(input.msn, 'crewSets', parseInt(e.target.value) || 1)
        }
        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
        aria-label={`Crew Sets for MSN ${input.msn}`}
      />

      {/* ACMI Rate (EUR/BH) */}
      <input
        type="number"
        step="0.01"
        value={input.acmiRate}
        onChange={(e) => onUpdate(input.msn, 'acmiRate', e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
        aria-label={`ACMI Rate for MSN ${input.msn}`}
      />

      {/* Remove button */}
      <button
        onClick={() => onRemove(input.msn)}
        className="p-1 text-gray-500 hover:text-red-400 transition-colors rounded hover:bg-gray-700"
        aria-label={`Remove MSN ${input.msn}`}
      >
        <X size={16} />
      </button>
    </div>
  )
}
