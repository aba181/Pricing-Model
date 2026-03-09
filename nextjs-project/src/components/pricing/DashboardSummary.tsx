'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { usePricingStore } from '@/stores/pricing-store'
import type { MsnInput, ComponentBreakdown, MsnPnlResult } from '@/stores/pricing-store'
import { computePeriodMonths } from '@/stores/pricing-store'
import { calculatePnlAction } from '@/app/actions/pricing'
import type { CalculateResponse } from '@/app/actions/pricing'
import { MsnInputRow } from './MsnInputRow'
import { SummaryTable } from './SummaryTable'
import { SaveQuoteDialog } from '@/components/quotes/SaveQuoteDialog'

interface EprMatrixRowApi {
  cycle_ratio: string
  benign_rate: string
  hot_rate: string
}

interface AircraftOption {
  id: number
  msn: number
  aircraft_type: string
  registration: string | null
  lease_rent_eur: string | null
  six_year_check_eur: string | null
  twelve_year_check_eur: string | null
  ldg_eur: string | null
  apu_rate_usd: string | null
  llp1_rate_usd: string | null
  llp2_rate_usd: string | null
  epr_matrix: EprMatrixRowApi[]
}

interface DashboardSummaryProps {
  aircraftList: AircraftOption[]
}

/** Convert API snake_case breakdown to camelCase store format */
function toStoreBreakdown(api: {
  aircraft_eur_per_bh: string
  crew_eur_per_bh: string
  maintenance_eur_per_bh: string
  insurance_eur_per_bh: string
  doc_eur_per_bh: string
  other_cogs_eur_per_bh: string
  overhead_eur_per_bh: string
  total_cost_per_bh: string
  revenue_per_bh: string
  margin_percent: string
  final_rate_per_bh: string
}): ComponentBreakdown {
  return {
    aircraftEurPerBh: api.aircraft_eur_per_bh ?? '0',
    crewEurPerBh: api.crew_eur_per_bh ?? '0',
    maintenanceEurPerBh: api.maintenance_eur_per_bh ?? '0',
    insuranceEurPerBh: api.insurance_eur_per_bh ?? '0',
    docEurPerBh: api.doc_eur_per_bh ?? '0',
    otherCogsEurPerBh: api.other_cogs_eur_per_bh ?? '0',
    overheadEurPerBh: api.overhead_eur_per_bh ?? '0',
    totalCostPerBh: api.total_cost_per_bh ?? '0',
    revenuePerBh: api.revenue_per_bh ?? '0',
    marginPercent: api.margin_percent ?? '0',
    finalRatePerBh: api.final_rate_per_bh ?? '0',
  }
}

function toStoreMsnResult(api: CalculateResponse['msn_results'][number]): MsnPnlResult {
  return {
    msn: api.msn,
    aircraftType: api.aircraft_type,
    breakdown: toStoreBreakdown(api.breakdown),
    monthlyCost: api.monthly_cost,
    monthlyRevenue: api.monthly_revenue,
    monthlyPnl: api.monthly_pnl,
  }
}

export function DashboardSummary({ aircraftList }: DashboardSummaryProps) {
  const {
    projectName,
    exchangeRate,
    marginPercent,
    bhFhRatio,
    apuFhRatio,
    msnInputs,
    msnResults,
    isCalculating,
    lastError,
    setProjectName,
    setExchangeRate,
    setBhFhRatio,
    setApuFhRatio,
    addMsnInput,
    removeMsnInput,
    updateMsnInput,
    setResults,
    setIsCalculating,
    setLastError,
  } = usePricingStore()

  const router = useRouter()
  const [selectedAircraft, setSelectedAircraft] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced calculation: fires 500ms after any input change
  useEffect(() => {
    if (msnInputs.length === 0) {
      setResults([], null)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setIsCalculating(true)
      setLastError(null)

      const result = await calculatePnlAction({
        exchange_rate: exchangeRate,
        margin_percent: marginPercent,
        msn_inputs: msnInputs.map((i) => ({
          msn: i.msn,
          mgh: i.mgh,
          cycle_ratio: i.cycleRatio,
          environment: i.environment,
          period_months: computePeriodMonths(i.periodStart, i.periodEnd),
          lease_type: i.leaseType,
          crew_sets: i.crewSets,
        })),
      })

      if ('error' in result) {
        setLastError(result.error)
        setIsCalculating(false)
        return
      }

      const calcResponse = result as CalculateResponse
      const converted = calcResponse.msn_results.map(toStoreMsnResult)
      const total = calcResponse.total
        ? toStoreBreakdown(calcResponse.total)
        : null

      setResults(converted, total)
      setIsCalculating(false)
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msnInputs, exchangeRate, marginPercent])

  const handleAddAircraft = () => {
    if (!selectedAircraft) return
    const ac = aircraftList.find((a) => a.id === Number(selectedAircraft))
    if (!ac) return

    // Prevent duplicate MSN
    if (msnInputs.some((i) => i.msn === ac.msn)) return

    // Default: current month to 12 months later
    const now = new Date()
    const startYear = now.getFullYear()
    const startMonth = now.getMonth() + 1 // 1-indexed
    const endDate = new Date(startYear, startMonth - 1 + 11, 1) // 11 months ahead (total 12 inclusive)
    const endYear = endDate.getFullYear()
    const endMonth = endDate.getMonth() + 1
    const defaultStart = `${startYear}-${String(startMonth).padStart(2, '0')}`
    const defaultEnd = `${endYear}-${String(endMonth).padStart(2, '0')}`

    const newInput: MsnInput = {
      aircraftId: ac.id,
      msn: ac.msn,
      aircraftType: ac.aircraft_type,
      registration: ac.registration,
      mgh: '350',
      cycleRatio: '1.0',
      environment: 'benign',
      periodStart: defaultStart,
      periodEnd: defaultEnd,
      leaseType: 'wet',
      crewSets: 4,
      acmiRate: '0',
      excessBh: '0',
      excessHourRate: '0',
      bhFhRatio: bhFhRatio,
      apuFhRatio: apuFhRatio,
      // Aircraft rates from Aircraft tab (EUR, fixed)
      leaseRentEur: ac.lease_rent_eur ?? '0',
      sixYearCheckEur: ac.six_year_check_eur ?? '0',
      twelveYearCheckEur: ac.twelve_year_check_eur ?? '0',
      ldgEur: ac.ldg_eur ?? '0',
      // Aircraft rates from Aircraft tab (USD, variable per engine)
      apuRateUsd: ac.apu_rate_usd ?? '0',
      llp1RateUsd: ac.llp1_rate_usd ?? '0',
      llp2RateUsd: ac.llp2_rate_usd ?? '0',
      // EPR matrix from Aircraft tab
      eprMatrix: (ac.epr_matrix ?? []).map((r) => ({
        cycleRatio: parseFloat(r.cycle_ratio),
        benignRate: parseFloat(r.benign_rate),
        hotRate: parseFloat(r.hot_rate),
      })),
    }

    addMsnInput(newInput)
    setSelectedAircraft('')
  }

  // Available aircraft (not already added)
  const availableAircraft = aircraftList.filter(
    (ac) => !msnInputs.some((i) => i.msn === ac.msn)
  )

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {lastError && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-200 text-sm">
          {lastError}
        </div>
      )}

      {/* Project header and global inputs */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[11px] font-medium text-gray-400 mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Untitled Project"
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div className="w-[120px]">
            <label className="block text-[11px] font-medium text-gray-400 mb-1">
              USD/EUR Rate
            </label>
            <input
              type="number"
              step="0.0001"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div className="w-[100px]">
            <label className="block text-[11px] font-medium text-gray-400 mb-1">
              BH:FH
            </label>
            <input
              type="number"
              step="0.01"
              value={bhFhRatio}
              onChange={(e) => setBhFhRatio(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div className="w-[100px]">
            <label className="block text-[11px] font-medium text-gray-400 mb-1">
              APU FH:FH
            </label>
            <input
              type="number"
              step="0.01"
              value={apuFhRatio}
              onChange={(e) => setApuFhRatio(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          {isCalculating && (
            <div className="text-xs text-indigo-400 pb-2">Calculating...</div>
          )}
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={msnResults.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={12} />
            Save as Quote
          </button>
          {savedNotice && (
            <div className="text-xs text-green-400 pb-2">
              Saved: {savedNotice}
            </div>
          )}
        </div>
      </div>

      {/* Side-by-side: Summary (left) + MSN Inputs (right) */}
      <div className="flex gap-4 items-start">
        {/* Left: Summary Table */}
        <div className="shrink-0 w-[340px]">
          <SummaryTable />
        </div>

        {/* Right: MSN Inputs */}
        <div className="flex-1 min-w-0">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            {/* Header + Add Aircraft */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-gray-100">
                MSN Inputs ({msnInputs.length})
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={selectedAircraft}
                  onChange={(e) => setSelectedAircraft(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-100 focus:border-indigo-400 focus:outline-none"
                >
                  <option value="">Select aircraft...</option>
                  {availableAircraft.map((ac) => (
                    <option key={ac.id} value={ac.id}>
                      MSN {ac.msn} - {ac.aircraft_type}
                      {ac.registration ? ` (${ac.registration})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddAircraft}
                  disabled={!selectedAircraft}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={12} />
                  Add
                </button>
              </div>
            </div>

            {/* MSN cards */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {msnInputs.map((input) => (
                <MsnInputRow
                  key={input.msn}
                  input={input}
                  onUpdate={updateMsnInput}
                  onRemove={removeMsnInput}
                />
              ))}
            </div>

            {msnInputs.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-6">
                No aircraft added yet. Select an aircraft above to begin pricing.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Save Quote Dialog */}
      <SaveQuoteDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSaved={(quoteNumber) => {
          setSavedNotice(quoteNumber)
          setTimeout(() => setSavedNotice(null), 5000)
        }}
      />
    </div>
  )
}
