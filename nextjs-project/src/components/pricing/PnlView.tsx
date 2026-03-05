'use client'

import { usePricingStore } from '@/stores/pricing-store'
import { MsnSwitcher } from './MsnSwitcher'
import { MarginInput } from './MarginInput'
import { PnlTable } from './PnlTable'

export function PnlView() {
  const msnInputs = usePricingStore((s) => s.msnInputs)
  const lastError = usePricingStore((s) => s.lastError)

  if (msnInputs.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-500 text-sm">
          Configure MSNs on the Dashboard to see P&L calculations
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {lastError && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-400">
          {lastError}
        </div>
      )}
      <MsnSwitcher />
      <MarginInput />
      <PnlTable />
    </div>
  )
}
