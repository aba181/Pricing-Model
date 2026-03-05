'use client'

import { usePricingStore } from '@/stores/pricing-store'

export function MsnSwitcher() {
  const msnInputs = usePricingStore((s) => s.msnInputs)
  const selectedMsn = usePricingStore((s) => s.selectedMsn)
  const setSelectedMsn = usePricingStore((s) => s.setSelectedMsn)

  if (msnInputs.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setSelectedMsn(null)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          selectedMsn === null
            ? 'bg-indigo-400 text-white'
            : 'bg-gray-800 text-gray-400 hover:text-gray-100 hover:bg-gray-700'
        }`}
      >
        Total Project
      </button>
      {msnInputs.map((input) => (
        <button
          key={input.msn}
          onClick={() => setSelectedMsn(input.msn)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedMsn === input.msn
              ? 'bg-indigo-400 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-gray-100 hover:bg-gray-700'
          }`}
        >
          MSN {input.msn}
          {input.registration ? ` (${input.registration})` : ''}
        </button>
      ))}
    </div>
  )
}
