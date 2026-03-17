'use client'

import { useState, useCallback } from 'react'
import { usePricingStore } from '@/stores/pricing-store'
import { generateMonthRange } from '@/stores/pricing-store'
import { useCrewConfigStore } from '@/stores/crew-config-store'
import { useCostsConfigStore } from '@/stores/costs-config-store'
import { fmt, fmtPct, fmtDec, valColor } from '@/lib/format'
import { PNL_ROWS, MARGIN_KEYS, KPI_DECIMAL_KEYS, ALL_DATA_KEYS } from '@/lib/pnl-row-defs'
import { buildMonthlyData } from '@/lib/pnl-monthly-builder'
import { deriveCrewValues, deriveCostsValues, computeMsnConfig } from '@/lib/pnl-msn-config'
import { CostDetailPopover } from './CostDetailPopover'

// ---- Component ----

interface PopoverState {
  monthIndex: number
  anchorRect: DOMRect
}

export function PnlTable() {
  const selectedMsn = usePricingStore((s) => s.selectedMsn)
  const msnResults = usePricingStore((s) => s.msnResults)
  const totalResult = usePricingStore((s) => s.totalResult)
  const isCalculating = usePricingStore((s) => s.isCalculating)
  const msnInputs = usePricingStore((s) => s.msnInputs)
  const exchangeRate = parseFloat(usePricingStore((s) => s.exchangeRate) || '0.85')

  // -- Crew config store --
  const crewPayroll = useCrewConfigStore((s) => s.payroll)
  const crewOtherCost = useCrewConfigStore((s) => s.otherCost)
  const crewTraining = useCrewConfigStore((s) => s.training)
  const crewAvgAC = useCrewConfigStore((s) => s.averageAC)
  const crewFdDays = useCrewConfigStore((s) => s.fdDays)
  const crewNfdDays = useCrewConfigStore((s) => s.nfdDays)

  // -- Costs config store --
  const costsMaintPersonnel = useCostsConfigStore((s) => s.maintPersonnel)
  const costsMaintCosts = useCostsConfigStore((s) => s.maintCosts)
  const costsInsurance = useCostsConfigStore((s) => s.insurance)
  const costsDoc = useCostsConfigStore((s) => s.doc)
  const costsOtherCogs = useCostsConfigStore((s) => s.otherCogs)
  const costsOverhead = useCostsConfigStore((s) => s.overhead)
  const costsAvgAc = useCostsConfigStore((s) => s.avgAc)

  // -- Cost detail popover state --
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const closePopover = useCallback(() => setPopover(null), [])

  // -- Derive crew and costs values using extracted modules --
  const crew = deriveCrewValues(
    crewPayroll, crewOtherCost, crewTraining, crewAvgAC, crewFdDays, crewNfdDays,
  )
  const costs = deriveCostsValues(
    costsMaintPersonnel, costsMaintCosts, costsInsurance, costsDoc,
    costsOtherCogs, costsOverhead, costsAvgAc, exchangeRate,
  )

  // -- Determine which data to display --
  let periodStart = ''
  let periodEnd = ''
  let hasData = false

  if (selectedMsn !== null) {
    const match = msnResults.find((r) => r.msn === selectedMsn)
    const input = msnInputs.find((i) => i.msn === selectedMsn)
    if (match || input) hasData = true
    if (input) {
      periodStart = input.periodStart
      periodEnd = input.periodEnd
    }
  } else {
    // Total project view
    if (msnInputs.length > 0) {
      hasData = true
      // Period: earliest start to latest end across all MSNs
      periodStart = msnInputs.reduce((min, i) => (i.periodStart < min ? i.periodStart : min), msnInputs[0].periodStart)
      periodEnd = msnInputs.reduce((max, i) => (i.periodEnd > max ? i.periodEnd : max), msnInputs[0].periodEnd)
    }
  }

  // Fallback: if no period set, default to 12 months from now
  if (!periodStart || !periodEnd) {
    const now = new Date()
    const sy = now.getFullYear()
    const sm = now.getMonth() + 1
    periodStart = `${sy}-${String(sm).padStart(2, '0')}`
    const ed = new Date(sy, sm - 1 + 11, 1)
    periodEnd = `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, '0')}`
  }

  const months = generateMonthRange(periodStart, periodEnd)

  // -- Compute monthly P&L data --
  let monthlyData: Record<string, number[]>

  if (selectedMsn !== null) {
    // Single MSN view
    const input = msnInputs.find((i) => i.msn === selectedMsn)
    if (input) {
      const r = computeMsnConfig(input, crew, costs, exchangeRate)
      monthlyData = buildMonthlyData(
        months, r.mgh, r.acmiRate, r.excessBh, r.excessHourRate,
        r.cycleRatio, r.bhFhRatio, r.apuFhRatio, r.cfg,
      )
    } else {
      // No input data — produce zeros
      monthlyData = {}
      for (const k of ALL_DATA_KEYS) {
        monthlyData[k] = new Array(months.length).fill(0)
      }
    }
  } else {
    // Total project — compute each MSN independently and sum per month
    monthlyData = {}
    for (const k of ALL_DATA_KEYS) {
      monthlyData[k] = new Array(months.length).fill(0)
    }

    for (const input of msnInputs) {
      const r = computeMsnConfig(input, crew, costs, exchangeRate)
      const msnData = buildMonthlyData(
        months, r.mgh, r.acmiRate, r.excessBh, r.excessHourRate,
        r.cycleRatio, r.bhFhRatio, r.apuFhRatio, r.cfg,
      )

      // Zero out months outside this MSN's active period
      for (let m = 0; m < months.length; m++) {
        const monthStr = `${months[m].year}-${String(months[m].month).padStart(2, '0')}`
        if (monthStr < input.periodStart || monthStr > input.periodEnd) {
          for (const k of ALL_DATA_KEYS) {
            msnData[k][m] = 0
          }
        }
      }

      // Accumulate into total
      for (const k of ALL_DATA_KEYS) {
        for (let m = 0; m < months.length; m++) {
          monthlyData[k][m] += msnData[k][m]
        }
      }
    }

    // Recompute margins and KPI ratios from summed absolutes
    for (let m = 0; m < months.length; m++) {
      const rev = monthlyData['totalRevenue'][m]
      monthlyData['ebitdaMargin'][m] = rev > 0 ? monthlyData['ebitda'][m] / rev : 0
      monthlyData['ebitMargin'][m] = rev > 0 ? monthlyData['ebit'][m] / rev : 0
      monthlyData['netProfitMargin'][m] = rev > 0 ? monthlyData['netProfit'][m] / rev : 0
      // KPI ratios
      const ac = monthlyData['acOperational'][m]
      monthlyData['avgBhPerAc'][m] = ac > 0 ? monthlyData['bh'][m] / ac : 0
      const fhVal = monthlyData['fh'][m]
      const fcVal = monthlyData['fc'][m]
      monthlyData['fhFcRatio'][m] = fcVal > 0 ? fhVal / fcVal : 0
    }
  }

  // -- Empty state --
  if (!hasData && msnInputs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          Configure MSNs on the Dashboard to see P&L calculations
        </p>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          Select an MSN or Total Project to view P&L
        </p>
      </div>
    )
  }

  // Compute TOTAL column (sum across months)
  function getTotal(key: string): number {
    const arr = monthlyData[key]
    if (!arr) return 0
    return arr.reduce((s, v) => s + v, 0)
  }

  // Header: MSN number
  const headerLabel = selectedMsn !== null
    ? `MSN ${selectedMsn}`
    : 'Project Total'

  // Column widths
  const labelColWidth = 'min-w-[260px]'
  const dataColWidth = 'min-w-[100px]'

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden transition-opacity ${isCalculating ? 'opacity-60' : ''}`}>
      {/* MSN header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{headerLabel}</h2>
      </div>

      {/* Scrollable table container */}
      <div className="overflow-x-auto">
        <table className="w-max min-w-full text-xs">
          {/* Month header row */}
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-700">
              <th className={`sticky left-0 z-10 bg-white dark:bg-gray-900 text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-medium ${labelColWidth}`}>
                &nbsp;
              </th>
              {months.map((m, i) => (
                <th
                  key={i}
                  className={`text-right px-3 py-2 text-gray-500 dark:text-gray-400 font-medium ${dataColWidth}`}
                >
                  {m.label}
                </th>
              ))}
              <th className={`text-right px-3 py-2 text-gray-900 dark:text-gray-100 font-semibold ${dataColWidth} border-l border-gray-300 dark:border-gray-700`}>
                TOTAL
              </th>
            </tr>
          </thead>

          <tbody>
            {PNL_ROWS.map((row, idx) => {
              const key = row.key ?? ''
              const vals = monthlyData[key]
              const total = key ? getTotal(key) : 0
              const isMargin = MARGIN_KEYS.has(key)
              const isKpiDec = KPI_DECIMAL_KEYS.has(key)

              // Section header
              if (row.kind === 'section') {
                return (
                  <tr key={idx} className="border-t border-gray-300 dark:border-gray-700">
                    <td
                      colSpan={months.length + 2}
                      className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 pt-4 pb-1 text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-semibold"
                    >
                      {row.label}
                    </td>
                  </tr>
                )
              }

              // Category label (A, C, M, DOC, I, Other)
              if (row.kind === 'category') {
                return (
                  <tr key={idx}>
                    <td
                      colSpan={months.length + 2}
                      className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-1 text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-medium pl-6"
                    >
                      {row.label}
                    </td>
                  </tr>
                )
              }

              // KPI header
              if (row.kind === 'kpi-header') {
                return (
                  <tr key={idx} className="border-t-2 border-gray-300 dark:border-gray-600">
                    <td
                      colSpan={months.length + 2}
                      className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 pt-4 pb-1 text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-semibold"
                    >
                      {row.label}
                    </td>
                  </tr>
                )
              }

              // Total / subtotal rows
              if (row.kind === 'total') {
                return (
                  <tr key={idx} className="border-t border-gray-300 dark:border-gray-600">
                    <td className={`sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-1.5 text-gray-900 dark:text-gray-100 font-semibold ${labelColWidth}`}>
                      {row.label}
                    </td>
                    {(vals ?? []).map((v, mi) => (
                      <td key={mi} className={`text-right px-3 py-1.5 font-mono font-semibold text-gray-900 dark:text-gray-100 ${dataColWidth} ${valColor(v)}`}>
                        {fmt(v, 0)}
                      </td>
                    ))}
                    <td className={`text-right px-3 py-1.5 font-mono font-semibold text-gray-900 dark:text-gray-100 ${dataColWidth} border-l border-gray-300 dark:border-gray-700 ${valColor(total)}`}>
                      {fmt(total, 0)}
                    </td>
                  </tr>
                )
              }

              // Result rows (Contribution I/II/III, EBIT, Net Profit)
              if (row.kind === 'result') {
                return (
                  <tr key={idx} className="border-t border-gray-300 dark:border-gray-600 bg-gray-100/30 dark:bg-gray-800/30">
                    <td className={`sticky left-0 z-10 bg-gray-100/30 dark:bg-gray-800/30 px-4 py-2 text-gray-900 dark:text-gray-100 font-bold ${labelColWidth}`}>
                      {row.label}
                    </td>
                    {(vals ?? []).map((v, mi) => (
                      <td key={mi} className={`text-right px-3 py-2 font-mono font-bold ${dataColWidth} ${v < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {fmt(v, 0)}
                      </td>
                    ))}
                    <td className={`text-right px-3 py-2 font-mono font-bold ${dataColWidth} border-l border-gray-300 dark:border-gray-700 ${total < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {fmt(total, 0)}
                    </td>
                  </tr>
                )
              }

              // Margin rows
              if (row.kind === 'margin') {
                const avgMargin = isMargin && months.length > 0
                  ? (vals ?? []).reduce((s, v) => s + v, 0) / months.length
                  : 0
                return (
                  <tr key={idx}>
                    <td className={`sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-1 text-gray-500 dark:text-gray-400 italic ${labelColWidth}`}>
                      {row.label}
                    </td>
                    {(vals ?? []).map((v, mi) => (
                      <td key={mi} className={`text-right px-3 py-1 font-mono text-gray-500 dark:text-gray-400 italic ${dataColWidth}`}>
                        {fmtPct(v)}
                      </td>
                    ))}
                    <td className={`text-right px-3 py-1 font-mono text-gray-500 dark:text-gray-400 italic ${dataColWidth} border-l border-gray-300 dark:border-gray-700`}>
                      {fmtPct(avgMargin)}
                    </td>
                  </tr>
                )
              }

              // KPI rows
              if (row.kind === 'kpi') {
                const kpiTotal = key ? getTotal(key) : 0
                return (
                  <tr key={idx}>
                    <td className={`sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-1 text-gray-700 dark:text-gray-300 ${labelColWidth}`}>
                      {row.label}
                    </td>
                    {(vals ?? []).map((v, mi) => (
                      <td key={mi} className={`text-right px-3 py-1 font-mono text-gray-700 dark:text-gray-300 ${dataColWidth}`}>
                        {isKpiDec ? fmtDec(v, 2) : fmt(v, 0)}
                      </td>
                    ))}
                    <td className={`text-right px-3 py-1 font-mono text-gray-700 dark:text-gray-300 ${dataColWidth} border-l border-gray-300 dark:border-gray-700`}>
                      {isKpiDec ? fmtDec(kpiTotal / Math.max(months.length, 1), 2) : fmt(kpiTotal, 0)}
                    </td>
                  </tr>
                )
              }

              // Regular item rows
              const isClickable = key === 'maintReservesVariable'
              return (
                <tr key={idx} className="hover:bg-gray-100/20 dark:bg-gray-800/20">
                  <td className={`sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-1 text-gray-700 dark:text-gray-300 pl-8 ${labelColWidth}`}>
                    {row.label}
                  </td>
                  {(vals ?? []).map((v, mi) => (
                    <td
                      key={mi}
                      className={`text-right px-3 py-1 font-mono text-gray-700 dark:text-gray-300 ${dataColWidth} ${valColor(v)} ${isClickable ? 'cursor-pointer hover:underline hover:text-indigo-600 dark:hover:text-indigo-400' : ''}`}
                      onClick={isClickable ? (e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        setPopover({ monthIndex: mi, anchorRect: rect })
                      } : undefined}
                    >
                      {fmt(v, 0)}
                    </td>
                  ))}
                  <td className={`text-right px-3 py-1 font-mono text-gray-700 dark:text-gray-300 ${dataColWidth} border-l border-gray-300 dark:border-gray-700 ${valColor(total)}`}>
                    {fmt(total, 0)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Cost detail popover */}
      {popover && (
        <CostDetailPopover
          monthLabel={months[popover.monthIndex]?.label ?? ''}
          eprMr={monthlyData['maintReservesVariable_epr']?.[popover.monthIndex] ?? 0}
          llpMr={monthlyData['maintReservesVariable_llp']?.[popover.monthIndex] ?? 0}
          apuMr={monthlyData['maintReservesVariable_apu']?.[popover.monthIndex] ?? 0}
          fh={monthlyData['fh']?.[popover.monthIndex] ?? 0}
          fc={monthlyData['fc']?.[popover.monthIndex] ?? 0}
          apuFh={monthlyData['apuFh']?.[popover.monthIndex] ?? 0}
          anchorRect={popover.anchorRect}
          onClose={closePopover}
        />
      )}
    </div>
  )
}
