'use client'

import { useState } from 'react'
import { usePricingStore } from '@/stores/pricing-store'
import { useCrewConfigStore } from '@/stores/crew-config-store'
import { useCostsConfigStore } from '@/stores/costs-config-store'
import { computeMsnPnlSummary } from '@/lib/pnl-engine'
import { ParameterPicker, SENSITIVITY_PARAMS } from './ParameterPicker'
import { SensitivityChart, type DataPoint } from './SensitivityChart'
import { SensitivityTable } from './SensitivityTable'

const STEPS = [-0.20, -0.10, 0, 0.10, 0.20]
const STEP_LABELS = ['-20%', '-10%', 'Base', '+10%', '+20%']

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
        if (msnInputs.length === 0) return 0
        return (
          msnInputs.reduce((sum, m) => sum + (parseFloat(m.mgh) || 0), 0) /
          msnInputs.length
        )
      case 'cycleRatio':
        if (msnInputs.length === 0) return 0
        return (
          msnInputs.reduce((sum, m) => sum + (parseFloat(m.cycleRatio) || 0), 0) /
          msnInputs.length
        )
      case 'crewSets':
        if (msnInputs.length === 0) return 0
        return (
          msnInputs.reduce((sum, m) => sum + m.crewSets, 0) / msnInputs.length
        )
      default:
        return 0
    }
  }

  function handleRunAnalysis() {
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

      // Read full store data for P&L engine
      const crewData = useCrewConfigStore.getState()
      const costsData = useCostsConfigStore.getState()
      const baseExRate = parseFloat(exchangeRate) || 0.85

      const dataPoints: DataPoint[] = []

      for (let i = 0; i < STEPS.length; i++) {
        const step = STEPS[i]
        const paramValue = baseValue * (1 + step)

        // Clone MSN inputs and apply parameter variation
        let stepExRate = baseExRate
        const stepInputs = msnInputs.map((m) => {
          const clone = { ...m }
          switch (selectedParam) {
            case 'exchangeRate':
              stepExRate = paramValue
              break
            case 'mgh':
              clone.mgh = paramValue.toString()
              break
            case 'cycleRatio':
              clone.cycleRatio = paramValue.toString()
              break
            case 'crewSets':
              clone.crewSets = Math.max(1, Math.round(paramValue))
              break
          }
          return clone
        })

        // Compute P&L for each MSN and aggregate
        let totalCost = 0
        let totalBh = 0
        let totalNetProfit = 0

        for (const input of stepInputs) {
          const summary = computeMsnPnlSummary(input, crewData, costsData, stepExRate)
          totalCost += summary.totalCost
          totalBh += summary.totalBh
          totalNetProfit += summary.netProfit
        }

        const costPerBh = totalBh > 0 ? totalCost / totalBh : 0

        dataPoints.push({
          label: STEP_LABELS[i],
          paramValue,
          eurPerBh: costPerBh,
          netProfit: totalNetProfit,
        })
      }

      setResults(dataPoints)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
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
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Add aircraft on the Dashboard page first to run sensitivity analysis.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
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
