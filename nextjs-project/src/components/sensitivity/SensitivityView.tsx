'use client'

import { useState } from 'react'
import { usePricingStore, computePeriodMonths } from '@/stores/pricing-store'
import { ParameterPicker, SENSITIVITY_PARAMS } from './ParameterPicker'
import { SensitivityChart, type DataPoint } from './SensitivityChart'
import { SensitivityTable } from './SensitivityTable'
import { runSensitivityAction } from '@/app/actions/sensitivity'

export function SensitivityView() {
  const { exchangeRate, marginPercent, msnInputs } = usePricingStore()
  const [selectedParam, setSelectedParam] = useState('mgh')
  const [results, setResults] = useState<DataPoint[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const paramInfo = SENSITIVITY_PARAMS.find((p) => p.key === selectedParam)
  const hasMsns = msnInputs.length > 0

  /** Get the base value for the selected parameter from the current store state */
  function getBaseValue(): number {
    switch (selectedParam) {
      case 'exchangeRate':
        return parseFloat(exchangeRate) || 0.85
      case 'marginPercent':
        return parseFloat(marginPercent) || 0
      case 'mgh':
        // Average MGH across all MSNs
        if (msnInputs.length === 0) return 0
        return (
          msnInputs.reduce((sum, m) => sum + (parseFloat(m.mgh) || 0), 0) /
          msnInputs.length
        )
      case 'cycleRatio':
        // Average cycle ratio across all MSNs
        if (msnInputs.length === 0) return 0
        return (
          msnInputs.reduce((sum, m) => sum + (parseFloat(m.cycleRatio) || 0), 0) /
          msnInputs.length
        )
      case 'crewSets':
        // Average crew sets across all MSNs
        if (msnInputs.length === 0) return 0
        return (
          msnInputs.reduce((sum, m) => sum + m.crewSets, 0) / msnInputs.length
        )
      default:
        return 0
    }
  }

  async function handleRunAnalysis() {
    if (!hasMsns) return

    setIsLoading(true)
    setError(null)
    setResults(null)

    try {
      const baseValue = getBaseValue()

      if (baseValue === 0 && selectedParam !== 'marginPercent') {
        setError(
          `Base value for ${paramInfo?.label ?? selectedParam} is 0. Please set a value on the Dashboard first.`
        )
        setIsLoading(false)
        return
      }

      const baseInputs = {
        exchange_rate: exchangeRate,
        margin_percent: marginPercent,
        msn_inputs: msnInputs.map((m) => ({
          msn: m.msn,
          mgh: m.mgh,
          cycle_ratio: m.cycleRatio,
          environment: m.environment,
          period_months: computePeriodMonths(m.periodStart, m.periodEnd),
          lease_type: m.leaseType,
          crew_sets: m.crewSets,
        })),
      }

      const result = await runSensitivityAction({
        baseInputs,
        paramKey: selectedParam,
        baseValue,
      })

      if ('error' in result) {
        setError(result.error)
      } else {
        setResults(result)
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <ParameterPicker selected={selectedParam} onChange={setSelectedParam} />
          <button
            onClick={handleRunAnalysis}
            disabled={isLoading || !hasMsns}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Calculating...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {/* Empty state: no MSNs */}
      {!hasMsns && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400 text-sm">
            Add aircraft on the Dashboard page first to run sensitivity analysis.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Results: chart and table side by side */}
      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SensitivityChart
            data={results}
            paramLabel={paramInfo?.label ?? selectedParam}
          />
          <SensitivityTable
            data={results}
            paramLabel={paramInfo?.label ?? selectedParam}
            paramUnit={paramInfo?.unit ?? ''}
          />
        </div>
      )}
    </div>
  )
}
