'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { usePricingStore } from '@/stores/pricing-store'
import type { MsnInput, ComponentBreakdown, MsnPnlResult } from '@/stores/pricing-store'
import { computePeriodMonths } from '@/stores/pricing-store'
import { calculatePnlAction } from '@/app/actions/pricing'
import type { CalculateResponse } from '@/app/actions/pricing'
import { MsnInputRow } from './MsnInputRow'

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

function formatCurrency(value: string | null | undefined): string {
  if (!value) return '0.00'
  const num = parseFloat(value)
  if (isNaN(num)) return '0.00'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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
    msnInputs,
    msnResults,
    totalResult,
    isCalculating,
    lastError,
    setProjectName,
    setExchangeRate,
    setMarginPercent,
    addMsnInput,
    removeMsnInput,
    updateMsnInput,
    setResults,
    setIsCalculating,
    setLastError,
  } = usePricingStore()

  const [selectedAircraft, setSelectedAircraft] = useState('')
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
      bhFhRatio: '1.2',
      apuFhRatio: '1.1',
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

  // Compute totals from results
  const totalMonthlyCost = msnResults.reduce(
    (sum, r) => sum + parseFloat(r.monthlyCost || '0'),
    0
  )
  // Revenue = ACMI Rate × MGH for each MSN
  const totalMonthlyRevenue = msnInputs.reduce(
    (sum, i) => sum + parseFloat(i.acmiRate || '0') * parseFloat(i.mgh || '0'),
    0
  )
  const totalMonthlyPnl = totalMonthlyRevenue - totalMonthlyCost

  // Available aircraft (not already added)
  const availableAircraft = aircraftList.filter(
    (ac) => !msnInputs.some((i) => i.msn === ac.msn)
  )

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {lastError && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-200 text-sm">
          {lastError}
        </div>
      )}

      {/* Project header and global inputs */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Project Name */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Untitled Project"
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {/* Exchange Rate */}
          <div className="w-[140px]">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              USD/EUR Rate
            </label>
            <input
              type="number"
              step="0.0001"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {/* Margin Percent */}
          <div className="w-[120px]">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Margin %
            </label>
            <input
              type="number"
              step="0.1"
              value={marginPercent}
              onChange={(e) => setMarginPercent(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {/* Calculating indicator */}
          {isCalculating && (
            <div className="text-xs text-indigo-400 pb-2">Calculating...</div>
          )}
        </div>
      </div>

      {/* MSN Input Grid */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-100">
            MSN Inputs ({msnInputs.length})
          </h2>

          {/* Add Aircraft */}
          <div className="flex items-center gap-2">
            <select
              value={selectedAircraft}
              onChange={(e) => setSelectedAircraft(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1.5 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
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
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
        </div>

        {/* Column headers */}
        {msnInputs.length > 0 && (
          <div className="grid grid-cols-[80px_70px_90px_100px_90px_80px_120px_120px_100px_80px_110px_80px_90px_40px] gap-2 px-3 mb-1">
            <span className="text-xs font-medium text-gray-500">MSN</span>
            <span className="text-xs font-medium text-gray-500">Type</span>
            <span className="text-xs font-medium text-gray-500">Reg</span>
            <span className="text-xs font-medium text-gray-500">MGH</span>
            <span className="text-xs font-medium text-gray-500">
              Cycle Ratio
            </span>
            <span className="text-xs font-medium text-gray-500">Env</span>
            <span className="text-xs font-medium text-gray-500">Start</span>
            <span className="text-xs font-medium text-gray-500">End</span>
            <span className="text-xs font-medium text-gray-500">Lease</span>
            <span className="text-xs font-medium text-gray-500">Crew</span>
            <span className="text-xs font-medium text-gray-500">ACMI Rate</span>
            <span className="text-xs font-medium text-gray-500">BH:FH</span>
            <span className="text-xs font-medium text-gray-500">APU FH:FH</span>
            <span />
          </div>
        )}

        {/* MSN rows */}
        <div className="space-y-1">
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
          <p className="text-sm text-gray-500 text-center py-6">
            No aircraft added yet. Select an aircraft above to begin pricing.
          </p>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-100 mb-3">
          Project Summary
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <p className="text-xs text-gray-400 mb-1">Total Monthly Cost</p>
            <p className="text-lg font-semibold text-gray-100">
              {formatCurrency(totalMonthlyCost.toFixed(2))}
              <span className="text-xs text-gray-500 ml-1">EUR</span>
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <p className="text-xs text-gray-400 mb-1">Total Monthly Revenue</p>
            <p className="text-lg font-semibold text-gray-100">
              {formatCurrency(totalMonthlyRevenue.toFixed(2))}
              <span className="text-xs text-gray-500 ml-1">EUR</span>
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <p className="text-xs text-gray-400 mb-1">Total Monthly P&L</p>
            <p
              className={`text-lg font-semibold ${
                totalMonthlyPnl >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {totalMonthlyPnl >= 0 ? '+' : ''}
              {formatCurrency(totalMonthlyPnl.toFixed(2))}
              <span className="text-xs text-gray-500 ml-1">EUR</span>
            </p>
          </div>
        </div>

        {/* Per-MSN results */}
        {msnResults.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-medium text-gray-400 mb-2">
              Per-MSN Rate (EUR/BH)
            </h3>
            <div className="space-y-1">
              {msnResults.map((r) => (
                <div
                  key={r.msn}
                  className="flex items-center justify-between py-1.5 px-3 bg-gray-800/30 rounded text-sm"
                >
                  <span className="text-gray-300">
                    MSN {r.msn} ({r.aircraftType})
                  </span>
                  <div className="flex gap-6 text-gray-100">
                    <span>
                      Cost:{' '}
                      <span className="font-medium">
                        {formatCurrency(r.breakdown.totalCostPerBh)}
                      </span>
                    </span>
                    <span>
                      Rate:{' '}
                      <span className="font-medium text-indigo-400">
                        {formatCurrency(r.breakdown.finalRatePerBh)}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalResult && msnResults.length > 1 && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300 font-medium">Project Total</span>
              <div className="flex gap-6 text-gray-100">
                <span>
                  Avg Cost:{' '}
                  <span className="font-medium">
                    {formatCurrency(totalResult.totalCostPerBh)}
                  </span>
                </span>
                <span>
                  Avg Rate:{' '}
                  <span className="font-medium text-indigo-400">
                    {formatCurrency(totalResult.finalRatePerBh)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
