'use client'

import { usePricingStore } from '@/stores/pricing-store'
import { generateMonthRange, computePeriodMonths } from '@/stores/pricing-store'

// ---- Formatting helpers ----

function fmt(value: number): string {
  if (isNaN(value)) return '-'
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function fmtPct(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '-'
  return (value * 100).toFixed(1) + '%'
}

function fmtDec(value: number, decimals = 1): string {
  if (isNaN(value)) return '-'
  return value.toFixed(decimals)
}

function valColor(value: number): string {
  if (value < 0) return 'text-red-400'
  return ''
}

// ---- Row type definitions ----

type RowKind =
  | 'section'       // e.g. "REVENUE", "VARIABLE COST"
  | 'category'      // e.g. "A", "C", "M", "DOC", "I", "Other"
  | 'item'          // regular line item
  | 'total'         // subtotal row (bold, top border)
  | 'result'        // profit/EBITDA/EBIT rows (bold, top border, background)
  | 'margin'        // percentage row
  | 'kpi-header'    // KPI's section header
  | 'kpi'           // KPI item

interface PnlRowDef {
  kind: RowKind
  label: string
  /** Key into the monthly values object, or null for computed/section rows */
  key?: string
}

// The exact P&L structure from the Excel
const PNL_ROWS: PnlRowDef[] = [
  // REVENUE
  { kind: 'section', label: 'REVENUE' },
  { kind: 'item', label: 'Wet Lease', key: 'wetLease' },
  { kind: 'item', label: 'Other revenue', key: 'otherRevenue' },
  { kind: 'item', label: 'Finance Income', key: 'financeIncome' },
  { kind: 'total', label: 'TOTAL REVENUE', key: 'totalRevenue' },

  // VARIABLE COST
  { kind: 'section', label: 'VARIABLE COST' },
  { kind: 'category', label: 'A' },
  { kind: 'item', label: 'Maintenance reserves - variable', key: 'maintReservesVariable' },
  { kind: 'item', label: 'Asset management fee', key: 'assetMgmtFee' },
  { kind: 'category', label: 'C' },
  { kind: 'item', label: 'Pilot - per diem', key: 'pilotPerDiem' },
  { kind: 'item', label: 'Cabin crew - per diem', key: 'cabinCrewPerDiem' },
  { kind: 'item', label: 'Accomodation & Travel C', key: 'accomTravelC' },
  { kind: 'category', label: 'M' },
  { kind: 'item', label: 'Spare Parts', key: 'spareParts' },
  { kind: 'item', label: 'Maintenance personnel - per diems', key: 'maintPersonnelPerDiem' },
  { kind: 'item', label: 'Accomodation & Travel M', key: 'accomTravelM' },
  { kind: 'item', label: 'Other maintenance V', key: 'otherMaintV' },
  { kind: 'category', label: 'DOC' },
  { kind: 'item', label: 'Fuel', key: 'fuel' },
  { kind: 'item', label: 'Handling', key: 'handling' },
  { kind: 'item', label: 'Navigation', key: 'navigation' },
  { kind: 'item', label: 'Airport Charges', key: 'airportCharges' },
  { kind: 'category', label: 'Other' },
  { kind: 'item', label: 'Commissions', key: 'commissions' },
  { kind: 'item', label: 'Delays/Cancellations', key: 'delaysCancellations' },
  { kind: 'total', label: 'TOTAL VARIABLE COST', key: 'totalVariableCost' },
  { kind: 'result', label: 'GROSS PROFIT - CONTRIBUTION I', key: 'contributionI' },

  // FIXED COST
  { kind: 'section', label: 'FIXED COST' },
  { kind: 'category', label: 'A' },
  { kind: 'item', label: 'Dry lease', key: 'dryLease' },
  { kind: 'item', label: 'Maintenance reserves - fixed', key: 'maintReservesFixed' },
  { kind: 'category', label: 'C' },
  { kind: 'item', label: 'Pilot - salary', key: 'pilotSalary' },
  { kind: 'item', label: 'Cabin crew - salary', key: 'cabinCrewSalary' },
  { kind: 'item', label: 'Staff Uniform F', key: 'staffUniformF' },
  { kind: 'item', label: 'Training', key: 'trainingC' },
  { kind: 'category', label: 'M' },
  { kind: 'item', label: 'Line Maintenance', key: 'lineMaintenance' },
  { kind: 'item', label: 'Base Maintenance', key: 'baseMaintenance' },
  { kind: 'item', label: 'Maintenance personnel - salary', key: 'maintPersonnelSalary' },
  { kind: 'item', label: 'Trainning', key: 'trainningM' },
  { kind: 'item', label: 'Maintenance C-Check', key: 'maintCCheck' },
  { kind: 'category', label: 'I' },
  { kind: 'item', label: 'Insurance fixed', key: 'insuranceFixed' },
  { kind: 'category', label: 'Other' },
  { kind: 'item', label: 'Technical', key: 'technical' },
  { kind: 'item', label: 'Other Fixed', key: 'otherFixed' },
  { kind: 'total', label: 'TOTAL FIXED COST', key: 'totalFixedCost' },
  { kind: 'result', label: 'GROSS PROFIT - CONTRIBUTION II', key: 'contributionII' },

  // OVERHEAD
  { kind: 'section', label: 'OVERHEAD' },
  { kind: 'item', label: 'Personnel Cost - SS', key: 'personnelCostSS' },
  { kind: 'item', label: 'Personnel Cost', key: 'personnelCost' },
  { kind: 'item', label: 'Travel Expenses', key: 'travelExpenses' },
  { kind: 'item', label: 'Legal Expenses', key: 'legalExpenses' },
  { kind: 'item', label: 'License & Registration Cost', key: 'licenseRegCost' },
  { kind: 'item', label: 'Admin Cost', key: 'adminCost' },
  { kind: 'item', label: 'IT and Communications', key: 'itComms' },
  { kind: 'item', label: 'Admin and General Expenses', key: 'adminGeneralExp' },
  { kind: 'item', label: 'Selling & Marketing Cost', key: 'sellingMarketingCost' },
  { kind: 'total', label: 'TOTAL OVERHEAD', key: 'totalOverhead' },

  // EBITDA and below
  { kind: 'result', label: 'EBITDA - CONTRIBUTION III', key: 'ebitda' },
  { kind: 'margin', label: 'EBITDA margin, %', key: 'ebitdaMargin' },
  { kind: 'item', label: 'DEPRECIATION & AMORTIZATION', key: 'depAmort' },
  { kind: 'result', label: 'EBIT', key: 'ebit' },
  { kind: 'margin', label: 'EBIT margin, %', key: 'ebitMargin' },
  { kind: 'item', label: 'Interest, net', key: 'interestNet' },
  { kind: 'item', label: 'FX, net', key: 'fxNet' },
  { kind: 'item', label: 'Tax', key: 'tax' },
  { kind: 'result', label: 'NET PROFIT', key: 'netProfit' },
  { kind: 'margin', label: 'Net profit margin, %', key: 'netProfitMargin' },

  // KPIs
  { kind: 'kpi-header', label: "KPI's" },
  { kind: 'kpi', label: 'No. A/C operational', key: 'acOperational' },
  { kind: 'kpi', label: 'BH', key: 'bh' },
  { kind: 'kpi', label: 'Average BH per A/C', key: 'avgBhPerAc' },
  { kind: 'kpi', label: 'FH', key: 'fh' },
  { kind: 'kpi', label: 'FC', key: 'fc' },
  { kind: 'kpi', label: 'FH:FC', key: 'fhFcRatio' },
]

// Keys for variable cost items
const VARIABLE_COST_KEYS = [
  'maintReservesVariable', 'assetMgmtFee',
  'pilotPerDiem', 'cabinCrewPerDiem', 'accomTravelC',
  'spareParts', 'maintPersonnelPerDiem', 'accomTravelM', 'otherMaintV',
  'fuel', 'handling', 'navigation', 'airportCharges',
  'commissions', 'delaysCancellations',
]

const FIXED_COST_KEYS = [
  'dryLease', 'maintReservesFixed',
  'pilotSalary', 'cabinCrewSalary', 'staffUniformF', 'trainingC',
  'lineMaintenance', 'baseMaintenance', 'maintPersonnelSalary', 'trainningM', 'maintCCheck',
  'insuranceFixed',
  'technical', 'otherFixed',
]

const OVERHEAD_KEYS = [
  'personnelCostSS', 'personnelCost', 'travelExpenses', 'legalExpenses',
  'licenseRegCost', 'adminCost', 'itComms', 'adminGeneralExp', 'sellingMarketingCost',
]

// ---- Build monthly data from breakdown (placeholder zeros + available breakdown mapping) ----

function buildMonthlyData(
  monthCount: number,
  breakdown: {
    aircraftEurPerBh: string
    crewEurPerBh: string
    maintenanceEurPerBh: string
    insuranceEurPerBh: string
    docEurPerBh: string
    otherCogsEurPerBh: string
    overheadEurPerBh: string
    totalCostPerBh: string
    revenuePerBh: string
    marginPercent: string
    finalRatePerBh: string
  } | null,
  mgh: number,
  acmiRate: number,
  cycleRatio: number
): Record<string, number[]> {
  const data: Record<string, number[]> = {}

  // Initialize all keys with zeros for all months
  const allKeys = [
    ...VARIABLE_COST_KEYS,
    ...FIXED_COST_KEYS,
    ...OVERHEAD_KEYS,
    'wetLease', 'otherRevenue', 'financeIncome',
    'totalRevenue', 'totalVariableCost', 'contributionI',
    'totalFixedCost', 'contributionII', 'totalOverhead',
    'ebitda', 'ebitdaMargin', 'depAmort', 'ebit', 'ebitMargin',
    'interestNet', 'fxNet', 'tax', 'netProfit', 'netProfitMargin',
    'acOperational', 'bh', 'avgBhPerAc', 'fh', 'fc', 'fhFcRatio',
  ]
  for (const k of allKeys) {
    data[k] = new Array(monthCount).fill(0)
  }

  if (!breakdown || mgh === 0) return data

  // Map breakdown values into monthly amounts (each active month gets same value)
  const aircraft = parseFloat(breakdown.aircraftEurPerBh) * mgh
  const crew = parseFloat(breakdown.crewEurPerBh) * mgh
  const maintenance = parseFloat(breakdown.maintenanceEurPerBh) * mgh
  const insurance = parseFloat(breakdown.insuranceEurPerBh) * mgh
  const doc = parseFloat(breakdown.docEurPerBh) * mgh
  const otherCogs = parseFloat(breakdown.otherCogsEurPerBh) * mgh
  const overhead = parseFloat(breakdown.overheadEurPerBh) * mgh
  // Revenue = ACMI Rate × MGH (user-provided rate, not backend finalRate)
  const revenue = acmiRate * mgh

  for (let m = 0; m < monthCount; m++) {
    // Revenue
    data['wetLease'][m] = revenue
    data['otherRevenue'][m] = 0
    data['financeIncome'][m] = 0
    data['totalRevenue'][m] = revenue

    // Variable cost -- distribute breakdown buckets to line items
    // Aircraft bucket -> maintenance reserves variable
    data['maintReservesVariable'][m] = aircraft * 0.7
    data['assetMgmtFee'][m] = aircraft * 0.3

    // Crew bucket -> per diems
    data['pilotPerDiem'][m] = crew * 0.4
    data['cabinCrewPerDiem'][m] = crew * 0.35
    data['accomTravelC'][m] = crew * 0.25

    // Maintenance bucket -> variable maintenance items
    data['spareParts'][m] = maintenance * 0.3
    data['maintPersonnelPerDiem'][m] = maintenance * 0.25
    data['accomTravelM'][m] = maintenance * 0.25
    data['otherMaintV'][m] = maintenance * 0.2

    // DOC bucket
    data['fuel'][m] = doc * 0.5
    data['handling'][m] = doc * 0.2
    data['navigation'][m] = doc * 0.15
    data['airportCharges'][m] = doc * 0.15

    // Other COGS
    data['commissions'][m] = otherCogs * 0.6
    data['delaysCancellations'][m] = otherCogs * 0.4

    // Total variable cost
    const totalVar = VARIABLE_COST_KEYS.reduce((s, k) => s + data[k][m], 0)
    data['totalVariableCost'][m] = totalVar
    data['contributionI'][m] = revenue - totalVar

    // Fixed cost -- currently map from existing breakdown split
    data['dryLease'][m] = aircraft * 0.5
    data['maintReservesFixed'][m] = aircraft * 0.3

    data['pilotSalary'][m] = crew * 0.35
    data['cabinCrewSalary'][m] = crew * 0.3
    data['staffUniformF'][m] = crew * 0.05
    data['trainingC'][m] = crew * 0.1

    data['lineMaintenance'][m] = maintenance * 0.2
    data['baseMaintenance'][m] = maintenance * 0.2
    data['maintPersonnelSalary'][m] = maintenance * 0.2
    data['trainningM'][m] = maintenance * 0.1
    data['maintCCheck'][m] = maintenance * 0.15

    data['insuranceFixed'][m] = insurance

    data['technical'][m] = otherCogs * 0.3
    data['otherFixed'][m] = otherCogs * 0.2

    const totalFixed = FIXED_COST_KEYS.reduce((s, k) => s + data[k][m], 0)
    data['totalFixedCost'][m] = totalFixed
    data['contributionII'][m] = data['contributionI'][m] - totalFixed

    // Overhead
    const ohPerItem = overhead / OVERHEAD_KEYS.length
    for (const k of OVERHEAD_KEYS) {
      data[k][m] = ohPerItem
    }
    data['totalOverhead'][m] = overhead

    // EBITDA
    data['ebitda'][m] = data['contributionII'][m] - overhead
    data['ebitdaMargin'][m] = revenue > 0 ? data['ebitda'][m] / revenue : 0

    // D&A, EBIT
    data['depAmort'][m] = 0
    data['ebit'][m] = data['ebitda'][m] - data['depAmort'][m]
    data['ebitMargin'][m] = revenue > 0 ? data['ebit'][m] / revenue : 0

    // Below EBIT
    data['interestNet'][m] = 0
    data['fxNet'][m] = 0
    data['tax'][m] = 0
    data['netProfit'][m] = data['ebit'][m] - data['interestNet'][m] - data['fxNet'][m] - data['tax'][m]
    data['netProfitMargin'][m] = revenue > 0 ? data['netProfit'][m] / revenue : 0

    // KPIs
    data['acOperational'][m] = 1
    data['bh'][m] = mgh
    data['avgBhPerAc'][m] = mgh
    data['fh'][m] = mgh
    data['fc'][m] = cycleRatio > 0 ? mgh / cycleRatio : 0
    data['fhFcRatio'][m] = cycleRatio
  }

  return data
}

// ---- Margin keys for special formatting ----
const MARGIN_KEYS = new Set(['ebitdaMargin', 'ebitMargin', 'netProfitMargin'])
const KPI_DECIMAL_KEYS = new Set(['fhFcRatio', 'avgBhPerAc'])

// ---- Component ----

export function PnlTable() {
  const selectedMsn = usePricingStore((s) => s.selectedMsn)
  const msnResults = usePricingStore((s) => s.msnResults)
  const totalResult = usePricingStore((s) => s.totalResult)
  const isCalculating = usePricingStore((s) => s.isCalculating)
  const msnInputs = usePricingStore((s) => s.msnInputs)

  // Determine which data to display
  let breakdown: typeof totalResult = null
  let mgh = 0
  let acmiRate = 0
  let cycleRatio = 1
  let periodStart = ''
  let periodEnd = ''

  if (selectedMsn !== null) {
    const match = msnResults.find((r) => r.msn === selectedMsn)
    const input = msnInputs.find((i) => i.msn === selectedMsn)
    if (match) {
      breakdown = match.breakdown
      mgh = input ? parseFloat(input.mgh) : 0
      acmiRate = input ? parseFloat(input.acmiRate || '0') : 0
      cycleRatio = input ? parseFloat(input.cycleRatio || '1') : 1
    }
    if (input) {
      periodStart = input.periodStart
      periodEnd = input.periodEnd
    }
  } else {
    // Total project view: use first MSN's period as representative
    if (totalResult) {
      breakdown = totalResult
      mgh = msnInputs.reduce((sum, i) => sum + parseFloat(i.mgh), 0)
      acmiRate = msnInputs.reduce((sum, i) => sum + parseFloat(i.acmiRate || '0') * parseFloat(i.mgh), 0) / (mgh || 1)
      // Weighted average cycle ratio
      cycleRatio = msnInputs.reduce((sum, i) => sum + parseFloat(i.cycleRatio || '1') * parseFloat(i.mgh), 0) / (mgh || 1)
    } else if (msnResults.length === 1) {
      breakdown = msnResults[0].breakdown
      mgh = msnInputs.length > 0 ? parseFloat(msnInputs[0].mgh) : 0
      acmiRate = msnInputs.length > 0 ? parseFloat(msnInputs[0].acmiRate || '0') : 0
      cycleRatio = msnInputs.length > 0 ? parseFloat(msnInputs[0].cycleRatio || '1') : 1
    }
    if (msnInputs.length > 0) {
      periodStart = msnInputs[0].periodStart
      periodEnd = msnInputs[0].periodEnd
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
  const periodMonths = computePeriodMonths(periodStart, periodEnd)
  const monthlyData = buildMonthlyData(periodMonths, breakdown, mgh, acmiRate, cycleRatio)

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
    <div className={`bg-gray-900 border border-gray-800 rounded-lg overflow-hidden transition-opacity ${isCalculating ? 'opacity-60' : ''}`}>
      {/* MSN header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-100">{headerLabel}</h2>
      </div>

      {/* Scrollable table container */}
      <div className="overflow-x-auto">
        <table className="w-max min-w-full text-xs">
          {/* Month header row */}
          <thead>
            <tr className="border-b border-gray-700">
              <th className={`sticky left-0 z-10 bg-gray-900 text-left px-4 py-2 text-gray-400 font-medium ${labelColWidth}`}>
                &nbsp;
              </th>
              {months.map((m, i) => (
                <th
                  key={i}
                  className={`text-right px-3 py-2 text-gray-400 font-medium ${dataColWidth}`}
                >
                  {m.label}
                </th>
              ))}
              <th className={`text-right px-3 py-2 text-gray-100 font-semibold ${dataColWidth} border-l border-gray-700`}>
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
                  <tr key={idx} className="border-t border-gray-700">
                    <td
                      colSpan={months.length + 2}
                      className="sticky left-0 z-10 bg-gray-900 px-4 pt-4 pb-1 text-xs text-indigo-400 uppercase tracking-wider font-semibold"
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
                      className="sticky left-0 z-10 bg-gray-900 px-4 py-1 text-[10px] text-gray-500 uppercase tracking-widest font-medium pl-6"
                    >
                      {row.label}
                    </td>
                  </tr>
                )
              }

              // KPI header
              if (row.kind === 'kpi-header') {
                return (
                  <tr key={idx} className="border-t-2 border-gray-600">
                    <td
                      colSpan={months.length + 2}
                      className="sticky left-0 z-10 bg-gray-900 px-4 pt-4 pb-1 text-xs text-indigo-400 uppercase tracking-wider font-semibold"
                    >
                      {row.label}
                    </td>
                  </tr>
                )
              }

              // Total / subtotal rows
              if (row.kind === 'total') {
                return (
                  <tr key={idx} className="border-t border-gray-600">
                    <td className={`sticky left-0 z-10 bg-gray-900 px-4 py-1.5 text-gray-100 font-semibold ${labelColWidth}`}>
                      {row.label}
                    </td>
                    {(vals ?? []).map((v, mi) => (
                      <td key={mi} className={`text-right px-3 py-1.5 font-mono font-semibold text-gray-100 ${dataColWidth} ${valColor(v)}`}>
                        {fmt(v)}
                      </td>
                    ))}
                    <td className={`text-right px-3 py-1.5 font-mono font-semibold text-gray-100 ${dataColWidth} border-l border-gray-700 ${valColor(total)}`}>
                      {fmt(total)}
                    </td>
                  </tr>
                )
              }

              // Result rows (Contribution I/II/III, EBIT, Net Profit)
              if (row.kind === 'result') {
                return (
                  <tr key={idx} className="border-t border-gray-600 bg-gray-800/30">
                    <td className={`sticky left-0 z-10 bg-gray-800/30 px-4 py-2 text-gray-100 font-bold ${labelColWidth}`}>
                      {row.label}
                    </td>
                    {(vals ?? []).map((v, mi) => (
                      <td key={mi} className={`text-right px-3 py-2 font-mono font-bold ${dataColWidth} ${v < 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {fmt(v)}
                      </td>
                    ))}
                    <td className={`text-right px-3 py-2 font-mono font-bold ${dataColWidth} border-l border-gray-700 ${total < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {fmt(total)}
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
                    <td className={`sticky left-0 z-10 bg-gray-900 px-4 py-1 text-gray-400 italic ${labelColWidth}`}>
                      {row.label}
                    </td>
                    {(vals ?? []).map((v, mi) => (
                      <td key={mi} className={`text-right px-3 py-1 font-mono text-gray-400 italic ${dataColWidth}`}>
                        {fmtPct(v)}
                      </td>
                    ))}
                    <td className={`text-right px-3 py-1 font-mono text-gray-400 italic ${dataColWidth} border-l border-gray-700`}>
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
                    <td className={`sticky left-0 z-10 bg-gray-900 px-4 py-1 text-gray-300 ${labelColWidth}`}>
                      {row.label}
                    </td>
                    {(vals ?? []).map((v, mi) => (
                      <td key={mi} className={`text-right px-3 py-1 font-mono text-gray-300 ${dataColWidth}`}>
                        {isKpiDec ? fmtDec(v, 2) : fmt(v)}
                      </td>
                    ))}
                    <td className={`text-right px-3 py-1 font-mono text-gray-300 ${dataColWidth} border-l border-gray-700`}>
                      {isKpiDec ? fmtDec(kpiTotal / Math.max(months.length, 1), 2) : fmt(kpiTotal)}
                    </td>
                  </tr>
                )
              }

              // Regular item rows
              return (
                <tr key={idx} className="hover:bg-gray-800/20">
                  <td className={`sticky left-0 z-10 bg-gray-900 px-4 py-1 text-gray-300 pl-8 ${labelColWidth}`}>
                    {row.label}
                  </td>
                  {(vals ?? []).map((v, mi) => (
                    <td key={mi} className={`text-right px-3 py-1 font-mono text-gray-300 ${dataColWidth} ${valColor(v)}`}>
                      {fmt(v)}
                    </td>
                  ))}
                  <td className={`text-right px-3 py-1 font-mono text-gray-300 ${dataColWidth} border-l border-gray-700 ${valColor(total)}`}>
                    {fmt(total)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
