'use client'

import { usePricingStore } from '@/stores/pricing-store'
import type { ComponentBreakdown } from '@/stores/pricing-store'

function formatRate(value: string): string {
  const num = parseFloat(value)
  if (isNaN(num)) return '--'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatMonthly(value: number): string {
  if (isNaN(value)) return '--'
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function colorForValue(value: number): string {
  if (value < 0) return 'text-red-400'
  if (value > 0) return 'text-green-400'
  return 'text-gray-100'
}

interface RowProps {
  label: string
  ratePerBh: string
  mgh: number
  showMonthly?: boolean
  bold?: boolean
  colorize?: boolean
}

function PnlRow({ label, ratePerBh, mgh, showMonthly = true, bold = false, colorize = false }: RowProps) {
  const rate = parseFloat(ratePerBh)
  const monthly = rate * mgh
  const rateColor = colorize ? colorForValue(rate) : 'text-gray-100'
  const monthlyColor = colorize ? colorForValue(monthly) : 'text-gray-100'
  const weight = bold ? 'font-semibold' : ''

  return (
    <tr className={bold ? 'border-t border-gray-700' : ''}>
      <td className={`px-4 py-2 text-sm text-gray-300 ${weight}`}>{label}</td>
      <td className={`px-4 py-2 text-sm text-right font-mono ${rateColor} ${weight}`}>
        {formatRate(ratePerBh)}
      </td>
      <td className={`px-4 py-2 text-sm text-right font-mono ${monthlyColor} ${weight}`}>
        {showMonthly ? formatMonthly(monthly) : '--'}
      </td>
    </tr>
  )
}

export function PnlTable() {
  const selectedMsn = usePricingStore((s) => s.selectedMsn)
  const msnResults = usePricingStore((s) => s.msnResults)
  const totalResult = usePricingStore((s) => s.totalResult)
  const isCalculating = usePricingStore((s) => s.isCalculating)
  const msnInputs = usePricingStore((s) => s.msnInputs)

  // Determine which data to display
  let breakdown: ComponentBreakdown | null = null
  let mgh = 0

  if (selectedMsn !== null) {
    const match = msnResults.find((r) => r.msn === selectedMsn)
    if (match) {
      breakdown = match.breakdown
      const input = msnInputs.find((i) => i.msn === selectedMsn)
      mgh = input ? parseFloat(input.mgh) : 0
    }
  } else {
    // Total project view
    if (totalResult) {
      breakdown = totalResult
      // Sum all MGH for total project
      mgh = msnInputs.reduce((sum, i) => sum + parseFloat(i.mgh), 0)
    } else if (msnResults.length === 1) {
      // Single MSN: use it as total
      breakdown = msnResults[0].breakdown
      mgh = msnInputs.length > 0 ? parseFloat(msnInputs[0].mgh) : 0
    }
  }

  // Empty state
  if (!breakdown && msnResults.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-500 text-sm">
          Configure MSNs on the Dashboard to see P&L calculations
        </p>
      </div>
    )
  }

  if (!breakdown) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-500 text-sm">
          Select an MSN or Total Project to view P&L
        </p>
      </div>
    )
  }

  // Computed values
  const totalCostPerBh = parseFloat(breakdown.totalCostPerBh)
  const finalRate = parseFloat(breakdown.finalRatePerBh)
  const grossProfitPerBh = finalRate - totalCostPerBh + parseFloat(breakdown.overheadEurPerBh)
  const netOperatingIncomePerBh = finalRate - totalCostPerBh

  const monthlyRevenue = finalRate * mgh
  const totalMonthlyCost = totalCostPerBh * mgh
  const overheadMonthly = parseFloat(breakdown.overheadEurPerBh) * mgh
  const grossProfitMonthly = grossProfitPerBh * mgh
  const netOperatingIncomeMonthly = netOperatingIncomePerBh * mgh

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-lg overflow-hidden transition-opacity ${isCalculating ? 'opacity-60' : ''}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-4 py-3 text-gray-100 font-semibold w-1/2">Item</th>
            <th className="text-right px-4 py-3 text-gray-100 font-semibold">EUR/BH</th>
            <th className="text-right px-4 py-3 text-gray-100 font-semibold">Monthly EUR</th>
          </tr>
        </thead>
        <tbody>
          {/* REVENUE Section */}
          <tr>
            <td colSpan={3} className="px-4 pt-4 pb-1 text-xs text-gray-500 uppercase tracking-wider font-semibold">
              Revenue
            </td>
          </tr>
          <tr>
            <td className="px-4 py-2 text-sm text-gray-300 pl-8">Block Hours Rate</td>
            <td className="px-4 py-2 text-sm text-right font-mono text-gray-100">
              {formatRate(breakdown.finalRatePerBh)}
            </td>
            <td className="px-4 py-2 text-sm text-right font-mono text-gray-500">--</td>
          </tr>
          <tr>
            <td className="px-4 py-2 text-sm text-gray-300 pl-8">Monthly Block Hours</td>
            <td className="px-4 py-2 text-sm text-right font-mono text-gray-100">
              {formatRate(String(mgh))}
            </td>
            <td className="px-4 py-2 text-sm text-right font-mono text-gray-500">--</td>
          </tr>
          <tr className="border-b border-gray-800">
            <td className="px-4 py-2 text-sm text-gray-300 pl-8 font-semibold">Monthly Revenue</td>
            <td className="px-4 py-2 text-sm text-right font-mono text-gray-500">--</td>
            <td className="px-4 py-2 text-sm text-right font-mono text-green-400 font-semibold">
              {formatMonthly(monthlyRevenue)}
            </td>
          </tr>

          {/* COST OF REVENUE Section */}
          <tr>
            <td colSpan={3} className="px-4 pt-4 pb-1 text-xs text-gray-500 uppercase tracking-wider font-semibold">
              Cost of Revenue
            </td>
          </tr>
          <PnlRow label="  A - Aircraft" ratePerBh={breakdown.aircraftEurPerBh} mgh={mgh} />
          <PnlRow label="  C - Crew" ratePerBh={breakdown.crewEurPerBh} mgh={mgh} />
          <PnlRow label="  M - Maintenance" ratePerBh={breakdown.maintenanceEurPerBh} mgh={mgh} />
          <PnlRow label="  I - Insurance" ratePerBh={breakdown.insuranceEurPerBh} mgh={mgh} />
          <PnlRow label="  DOC - Direct Operating Costs" ratePerBh={breakdown.docEurPerBh} mgh={mgh} />
          <PnlRow label="  Other COGS" ratePerBh={breakdown.otherCogsEurPerBh} mgh={mgh} />
          <PnlRow
            label="Total Cost of Revenue"
            ratePerBh={breakdown.totalCostPerBh}
            mgh={mgh}
            bold
          />

          {/* GROSS PROFIT Section */}
          <tr>
            <td colSpan={3} className="px-4 pt-4 pb-1 text-xs text-gray-500 uppercase tracking-wider font-semibold">
              Gross Profit
            </td>
          </tr>
          <tr className="border-t border-gray-700">
            <td className="px-4 py-2 text-sm text-gray-300 font-semibold">Gross Profit</td>
            <td className={`px-4 py-2 text-sm text-right font-mono font-semibold ${colorForValue(grossProfitPerBh)}`}>
              {formatRate(String(grossProfitPerBh))}
            </td>
            <td className={`px-4 py-2 text-sm text-right font-mono font-semibold ${colorForValue(grossProfitMonthly)}`}>
              {formatMonthly(grossProfitMonthly)}
            </td>
          </tr>

          {/* OVERHEAD Section */}
          <tr>
            <td colSpan={3} className="px-4 pt-4 pb-1 text-xs text-gray-500 uppercase tracking-wider font-semibold">
              Overhead
            </td>
          </tr>
          <PnlRow label="  Overhead" ratePerBh={breakdown.overheadEurPerBh} mgh={mgh} />

          {/* NET OPERATING INCOME Section */}
          <tr>
            <td colSpan={3} className="px-4 pt-4 pb-1 text-xs text-gray-500 uppercase tracking-wider font-semibold">
              Net Operating Income
            </td>
          </tr>
          <tr className="border-t border-gray-700 bg-gray-800/30">
            <td className="px-4 py-3 text-sm text-gray-100 font-semibold">Net Operating Income</td>
            <td className={`px-4 py-3 text-sm text-right font-mono font-semibold ${colorForValue(netOperatingIncomePerBh)}`}>
              {formatRate(String(netOperatingIncomePerBh))}
            </td>
            <td className={`px-4 py-3 text-sm text-right font-mono font-semibold ${colorForValue(netOperatingIncomeMonthly)}`}>
              {formatMonthly(netOperatingIncomeMonthly)}
            </td>
          </tr>

          {/* MARGIN Row */}
          <tr className="border-t border-gray-800">
            <td className="px-4 py-2 text-sm text-gray-400">Margin</td>
            <td className="px-4 py-2 text-sm text-right font-mono text-indigo-400 font-semibold">
              {formatRate(breakdown.marginPercent)}%
            </td>
            <td className="px-4 py-2 text-sm text-right font-mono text-gray-500">--</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
