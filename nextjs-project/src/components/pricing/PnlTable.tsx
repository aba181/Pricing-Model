'use client'

import { usePricingStore } from '@/stores/pricing-store'
import { generateMonthRange } from '@/stores/pricing-store'
import type { EprMatrixRow } from '@/stores/pricing-store'
import { useCrewConfigStore } from '@/stores/crew-config-store'
import { useCostsConfigStore } from '@/stores/costs-config-store'

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

// ---- EPR interpolation ----

/**
 * Interpolate EPR rate from the matrix for a given cycle ratio and environment.
 *
 * - Exact match → return that row's rate
 * - Between two rows → linear interpolation
 * - Below min → clamp to first row
 * - Above max → clamp to last row
 * - Empty matrix → 0
 */
function interpolateEpr(
  matrix: EprMatrixRow[],
  targetCr: number,
  environment: 'benign' | 'hot',
): number {
  if (matrix.length === 0) return 0
  const sorted = [...matrix].sort((a, b) => a.cycleRatio - b.cycleRatio)
  const getRate = (row: EprMatrixRow) =>
    environment === 'benign' ? row.benignRate : row.hotRate

  // Clamp below/above
  if (targetCr <= sorted[0].cycleRatio) return getRate(sorted[0])
  if (targetCr >= sorted[sorted.length - 1].cycleRatio) return getRate(sorted[sorted.length - 1])

  // Find bracketing rows
  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i]
    const hi = sorted[i + 1]
    if (targetCr >= lo.cycleRatio && targetCr <= hi.cycleRatio) {
      // Exact match
      if (lo.cycleRatio === hi.cycleRatio) return getRate(lo)
      // Linear interpolation
      const t = (targetCr - lo.cycleRatio) / (hi.cycleRatio - lo.cycleRatio)
      return getRate(lo) + t * (getRate(hi) - getRate(lo))
    }
  }
  return getRate(sorted[sorted.length - 1])
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
  { kind: 'kpi', label: 'APU FH', key: 'apuFh' },
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

/** All derived config values that feed into P&L line items */
interface PnlLineConfig {
  // A component — variable (from Aircraft tab + KPIs)
  maintReservesVariable: number // EPR MR + LLP MR + APU MR (monthly, EUR)
  // A component — fixed (from Aircraft tab)
  leaseRentEur: number
  maintReservesFixedEur: number
  // C component — variable (from Crew tab)
  pilotPerDiem: number      // (pilot per diem per set × crewSets) + BH bonus
  cabinCrewPerDiem: number  // depends on leaseType + aircraftType × crewSets
  accomTravelC: number      // (travel costs + accommodation) / avgAC / 12
  // C component — fixed (from Crew tab)
  pilotSalary: number       // (pilot SS + copilot SS) × crewSets
  cabinCrewSalary: number   // depends on leaseType + aircraftType
  staffUniformF: number     // uniform per month (per AC)
  trainingC: number         // training total per month (per AC)
  // M component — variable (from Costs tab + KPIs)
  spareParts: number        // BH × spare parts rate + tires/wheels fixed
  maintPersonnelPerDiem: number // sum of (engineers × perDiem × days) from maint personnel
  // M component — fixed (from Costs tab)
  lineMaintenance: number   // internal + 3rd party
  baseMaintenance: number   // capital maintenance
  maintPersonnelSalary: number
  trainningM: number
  maintCCheck: number
  // I component (from Costs tab)
  insuranceFixed: number    // insurance for selected MSN
  // Other (from Costs tab)
  technical: number
  otherFixed: number
  // Overhead (from Costs tab) — per month per AC
  personnelCostSS: number
  personnelCost: number
  travelExpenses: number
  legalExpenses: number
  licenseRegCost: number
  adminCost: number
  itComms: number
  adminGeneralExp: number
  sellingMarketingCost: number
  // DOC (from Costs tab) — per month per AC
  fuel: number
  handling: number
  navigation: number
  airportCharges: number
  // Other COGS (from Costs tab) — commission rates per BH
  commissionSummerRate: number // Nov–Apr: rate × BH
  commissionWinterRate: number // May–Oct: rate × BH
}

function buildMonthlyData(
  months: { year: number; month: number; label: string }[],
  mgh: number,
  acmiRate: number,
  excessBh: number,
  excessHourRate: number,
  cycleRatio: number,
  bhFhRatio: number,
  apuFhRatio: number,
  cfg: PnlLineConfig,
): Record<string, number[]> {
  const monthCount = months.length
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
    'acOperational', 'bh', 'avgBhPerAc', 'fh', 'fc', 'fhFcRatio', 'apuFh',
  ]
  for (const k of allKeys) {
    data[k] = new Array(monthCount).fill(0)
  }

  if (mgh === 0) return data

  // Revenue = (ACMI Rate × MGH) + (Excess BH × Excess Hour Rate)
  const revenue = acmiRate * mgh + excessBh * excessHourRate

  const totalBh = mgh + excessBh

  for (let m = 0; m < monthCount; m++) {
    // Revenue
    data['wetLease'][m] = revenue
    data['otherRevenue'][m] = 0
    data['financeIncome'][m] = 0
    data['totalRevenue'][m] = revenue

    // ── VARIABLE COST ──
    // A: reserves variable (EPR MR + LLP MR + APU MR) from Aircraft tab
    data['maintReservesVariable'][m] = cfg.maintReservesVariable
    data['assetMgmtFee'][m] = 0

    // C: per diems (from Crew tab)
    data['pilotPerDiem'][m] = cfg.pilotPerDiem
    data['cabinCrewPerDiem'][m] = cfg.cabinCrewPerDiem
    data['accomTravelC'][m] = cfg.accomTravelC

    // M: variable maintenance (from Costs tab)
    data['spareParts'][m] = cfg.spareParts
    data['maintPersonnelPerDiem'][m] = cfg.maintPersonnelPerDiem
    data['accomTravelM'][m] = 0
    data['otherMaintV'][m] = 0

    // DOC: from Costs tab
    data['fuel'][m] = cfg.fuel
    data['handling'][m] = cfg.handling
    data['navigation'][m] = cfg.navigation
    data['airportCharges'][m] = cfg.airportCharges

    // Other COGS: commissions = rate × totalBH, rate depends on calendar month
    // May–Oct → winter rate, Nov–Apr → summer rate
    const calMonth = months[m].month
    const isSummer = calMonth >= 5 && calMonth <= 10 // May(5) – Oct(10)
    data['commissions'][m] = (isSummer ? cfg.commissionWinterRate : cfg.commissionSummerRate) * totalBh
    data['delaysCancellations'][m] = 0

    // Total variable cost
    const totalVar = VARIABLE_COST_KEYS.reduce((s, k) => s + data[k][m], 0)
    data['totalVariableCost'][m] = totalVar
    data['contributionI'][m] = revenue - totalVar

    // ── FIXED COST ──
    // A: from Aircraft tab rates
    data['dryLease'][m] = cfg.leaseRentEur
    data['maintReservesFixed'][m] = cfg.maintReservesFixedEur

    // C: from Crew tab
    data['pilotSalary'][m] = cfg.pilotSalary
    data['cabinCrewSalary'][m] = cfg.cabinCrewSalary
    data['staffUniformF'][m] = cfg.staffUniformF
    data['trainingC'][m] = cfg.trainingC

    // M: from Costs tab
    data['lineMaintenance'][m] = cfg.lineMaintenance
    data['baseMaintenance'][m] = cfg.baseMaintenance
    data['maintPersonnelSalary'][m] = cfg.maintPersonnelSalary
    data['trainningM'][m] = cfg.trainningM
    data['maintCCheck'][m] = cfg.maintCCheck

    // I: from Costs tab (insurance for selected MSN)
    data['insuranceFixed'][m] = cfg.insuranceFixed

    // Other: from Costs tab
    data['technical'][m] = cfg.technical
    data['otherFixed'][m] = cfg.otherFixed

    const totalFixed = FIXED_COST_KEYS.reduce((s, k) => s + data[k][m], 0)
    data['totalFixedCost'][m] = totalFixed
    data['contributionII'][m] = data['contributionI'][m] - totalFixed

    // ── OVERHEAD ── from Costs tab (per month per AC)
    data['personnelCostSS'][m] = cfg.personnelCostSS
    data['personnelCost'][m] = cfg.personnelCost
    data['travelExpenses'][m] = cfg.travelExpenses
    data['legalExpenses'][m] = cfg.legalExpenses
    data['licenseRegCost'][m] = cfg.licenseRegCost
    data['adminCost'][m] = cfg.adminCost
    data['itComms'][m] = cfg.itComms
    data['adminGeneralExp'][m] = cfg.adminGeneralExp
    data['sellingMarketingCost'][m] = cfg.sellingMarketingCost

    const totalOH = OVERHEAD_KEYS.reduce((s, k) => s + data[k][m], 0)
    data['totalOverhead'][m] = totalOH

    // EBITDA
    data['ebitda'][m] = data['contributionII'][m] - totalOH
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

    // KPIs — total BH = MGH + Excess BH
    const fh = bhFhRatio > 0 ? totalBh / bhFhRatio : 0
    data['acOperational'][m] = 1
    data['bh'][m] = totalBh
    data['avgBhPerAc'][m] = totalBh
    data['fh'][m] = fh
    data['fc'][m] = cycleRatio > 0 ? fh / cycleRatio : 0
    data['fhFcRatio'][m] = cycleRatio
    data['apuFh'][m] = fh * apuFhRatio
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
  const exchangeRate = parseFloat(usePricingStore((s) => s.exchangeRate) || '0.85')

  // ── Crew config store ──
  const crewPayroll = useCrewConfigStore((s) => s.payroll)
  const crewOtherCost = useCrewConfigStore((s) => s.otherCost)
  const crewTraining = useCrewConfigStore((s) => s.training)
  const crewAvgAC = useCrewConfigStore((s) => s.averageAC)
  const crewFdDays = useCrewConfigStore((s) => s.fdDays)
  const crewNfdDays = useCrewConfigStore((s) => s.nfdDays)

  // ── Costs config store ──
  const costsMaintPersonnel = useCostsConfigStore((s) => s.maintPersonnel)
  const costsMaintCosts = useCostsConfigStore((s) => s.maintCosts)
  const costsInsurance = useCostsConfigStore((s) => s.insurance)
  const costsDoc = useCostsConfigStore((s) => s.doc)
  const costsOtherCogs = useCostsConfigStore((s) => s.otherCogs)
  const costsOverhead = useCostsConfigStore((s) => s.overhead)
  const costsAvgAc = useCostsConfigStore((s) => s.avgAc)

  // ── Derive crew values for P&L ──
  // Pilot salary per crew set = (pilot SS) + (copilot SS) where SS = gross + benefits
  const pilotSalaryPerSet = (crewPayroll[0].grossSalary + crewPayroll[0].benefits)
    + (crewPayroll[1].grossSalary + crewPayroll[1].benefits)
  // Cabin attendant SS (any of rows 2-5)
  const cabinAttendantSS = crewPayroll[2].grossSalary + crewPayroll[2].benefits
  // Senior attendant SS (row 6)
  const seniorAttendantSS = crewPayroll[6].grossSalary + crewPayroll[6].benefits
  // Uniform per month (per AC) = Uniforms amount / avgAC / 12
  const uniformsRow = crewOtherCost.find((r) => r.item === 'Uniforms')
  const uniformPerMonth = uniformsRow?.amount && crewAvgAC > 0 ? uniformsRow.amount / crewAvgAC / 12 : 0
  // Training total per month (per AC) = sum of all training amounts / avgAC / 12
  const trainingTotal = crewTraining.reduce((s, r) => s + (r.amount ?? 0), 0)
  const trainingPerMonth = crewAvgAC > 0 ? trainingTotal / crewAvgAC / 12 : 0
  // Accommodation & Travel C = (travel costs + accommodation) / avgAC / 12
  const travelCostsRow = crewOtherCost.find((r) => r.item === 'Travel costs')
  const accomRow = crewOtherCost.find((r) => r.item === 'Accomodation')
  const accomTravelCPerMonth = crewAvgAC > 0
    ? ((travelCostsRow?.amount ?? 0) + (accomRow?.amount ?? 0)) / crewAvgAC / 12
    : 0

  // Per diem per person = (perDiemFD × fdDays) + (perDiemNFD × nfdDays)
  const perDiemForRow = (row: typeof crewPayroll[number]) =>
    row.perDiemFD * crewFdDays + row.perDiemNFD * crewNfdDays
  // Pilot per diem per crew set = pilot perDiem + copilot perDiem
  const pilotPerDiemPerSet = perDiemForRow(crewPayroll[0]) + perDiemForRow(crewPayroll[1])
  // BH bonus for pilot = (pilot perBhPerdiem + copilot perBhPerdiem) × BH
  const bhBonusPerBh = crewPayroll[0].perBhPerdiem + crewPayroll[1].perBhPerdiem
  // Cabin attendant per diem (any of rows 2-5)
  const cabinAttPerDiem = perDiemForRow(crewPayroll[2])
  // Senior attendant per diem (row 6)
  const seniorAttPerDiem = perDiemForRow(crewPayroll[6])

  // ── Derive costs tab values for P&L ──
  // M component: look up by name in maintCosts
  const findMaintCost = (name: string) => costsMaintCosts.find((c) => c.name === name)?.perMonthPerAc ?? 0
  const lineMaintenanceVal = findMaintCost('Line Maintenance - Internal') + findMaintCost('Line Maintenance - 3rd Party')
  const baseMaintenanceVal = findMaintCost('Capital Maintenance')
  const maintPersonnelSalaryVal = findMaintCost('Maintenance Personnel Salary')
  const trainningVal = findMaintCost('Trainning')
  const cCheckVal = findMaintCost('C-Check')

  // Maintenance personnel per diems: sum of (engineers × perDiem × days) for each role
  const maintPerDiemVal = costsMaintPersonnel.reduce(
    (sum, p) => sum + p.engineers * p.perDiem * p.days,
    0,
  )

  // Spare parts: rate per BH and tires/wheels fixed cost
  const sparePartsRatePerBh = findMaintCost('Spare Parts KPI (Per BH)')
  const tiresWheelsCost = findMaintCost('Tires/Wheels')

  // Insurance: build MSN -> amount map (convert USD → EUR using dashboard exchange rate)
  const insuranceByMsn: Record<number, number> = {}
  for (const ins of costsInsurance) {
    insuranceByMsn[ins.msn] = ins.priceUsd * exchangeRate
  }

  // Other COGS: Technical and Other Fixed (per month per AC)
  const otherCogsComputed = costsOtherCogs.map((item) => {
    if (item.hasTotal && item.total !== undefined) {
      if (item.name === 'Other Fixed') return { ...item, perMonth: item.total / 9 / 7 }
      if (item.name === 'Technical') return { ...item, perMonth: costsAvgAc > 0 ? item.total / costsAvgAc / 12 : 0 }
    }
    return item
  })
  const technicalVal = otherCogsComputed.find((c) => c.name === 'Technical')?.perMonth ?? 0
  const otherFixedVal = otherCogsComputed.find((c) => c.name === 'Other Fixed')?.perMonth ?? 0
  // Commission rates per BH (seasonal)
  const commissionSummerRate = otherCogsComputed.find((c) => c.name === 'Commission - Third Party Summer')?.perMonth ?? 0
  const commissionWinterRate = otherCogsComputed.find((c) => c.name === 'Commission - Third Party Winter')?.perMonth ?? 0
  // MXC commission rate per BH (added to Personnel Cost overhead)
  const commissionMxcRate = otherCogsComputed.find((c) => c.name === 'Commission - MXC')?.perMonth ?? 0

  // DOC: per month per AC = total / avgAc / 12
  const docPerMonth = costsDoc.map((d) => (costsAvgAc > 0 ? d.total / costsAvgAc / 12 : 0))
  const fuelVal = docPerMonth[0] ?? 0
  const handlingVal = docPerMonth[1] ?? 0
  const navigationVal = docPerMonth[2] ?? 0
  const airportChargesVal = docPerMonth[3] ?? 0

  // Overhead: per month per AC = total / avgAc / 12
  const overheadPerMonth = costsOverhead.map((o) => (costsAvgAc > 0 ? o.total / costsAvgAc / 12 : 0))
  // Map overhead items to P&L keys by order (they match 1:1)
  // Personnel Cost - SS, Personnel Cost, Travel Expenses, Legal Expenses,
  // License & Registration Cost, Admin Cost, IT and Communications,
  // Admin and General Expenses, Selling & Marketing Cost

  // ── Determine which data to display ──
  let periodStart = ''
  let periodEnd = ''
  let hasData = false

  /** Sum of 6yr + 12yr + LDG from an MsnInput */
  function calcMaintFixed(i: typeof msnInputs[number]): number {
    return parseFloat(i.sixYearCheckEur || '0')
      + parseFloat(i.twelveYearCheckEur || '0')
      + parseFloat(i.ldgEur || '0')
  }

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

  /** Compute PnlLineConfig + buildMonthlyData params for a single MSN input */
  function computeForMsn(input: typeof msnInputs[number]) {
    const msnMgh = parseFloat(input.mgh) || 0
    const msnAcmiRate = parseFloat(input.acmiRate || '0')
    const msnExcessBh = parseFloat(input.excessBh || '0')
    const msnExcessHourRate = parseFloat(input.excessHourRate || '0')
    const msnCycleRatio = parseFloat(input.cycleRatio || '1')
    const msnBhFhRatio = parseFloat(input.bhFhRatio || '1.2')
    const msnApuFhRatio = parseFloat(input.apuFhRatio || '1.1')
    const msnCrewSets = input.crewSets
    const msnLeaseType = input.leaseType
    const msnAircraftType = input.aircraftType
    const msnEnvironment = input.environment
    const msnTotalBh = msnMgh + msnExcessBh

    // C component — salary
    const msnPilotSalary = pilotSalaryPerSet * msnCrewSets
    let msnCabinCrewSalary = 0
    if (msnLeaseType === 'wet') {
      if (msnAircraftType === 'A321') {
        msnCabinCrewSalary = (4 * cabinAttendantSS + seniorAttendantSS) * msnCrewSets
      } else {
        msnCabinCrewSalary = (3 * cabinAttendantSS + seniorAttendantSS) * msnCrewSets
      }
    } else if (msnLeaseType === 'moist') {
      msnCabinCrewSalary = seniorAttendantSS * msnCrewSets
    }

    // C component — per diems
    const msnPilotPerDiem = pilotPerDiemPerSet * msnCrewSets + bhBonusPerBh * msnTotalBh
    let msnCabinCrewPerDiem = 0
    if (msnLeaseType === 'wet') {
      if (msnAircraftType === 'A321') {
        msnCabinCrewPerDiem = (4 * cabinAttPerDiem + seniorAttPerDiem) * msnCrewSets
      } else {
        msnCabinCrewPerDiem = (3 * cabinAttPerDiem + seniorAttPerDiem) * msnCrewSets
      }
    } else if (msnLeaseType === 'moist') {
      msnCabinCrewPerDiem = seniorAttPerDiem * msnCrewSets
    }

    // Insurance for this MSN
    const msnInsurance = insuranceByMsn[input.msn] ?? 0

    // Maintenance reserves variable
    const msnFh = msnBhFhRatio > 0 ? msnTotalBh / msnBhFhRatio : 0
    const msnFc = msnCycleRatio > 0 ? msnFh / msnCycleRatio : 0
    const msnApuFh = msnFh * msnApuFhRatio
    const msnEprRate = interpolateEpr(input.eprMatrix ?? [], msnCycleRatio, msnEnvironment)
    const msnEprMr = msnEprRate * 2 * msnFh * exchangeRate
    const msnLlpMr = (parseFloat(input.llp1RateUsd || '0') + parseFloat(input.llp2RateUsd || '0')) * msnFc * exchangeRate
    const msnApuMr = parseFloat(input.apuRateUsd || '0') * msnApuFh * exchangeRate
    const msnMaintReservesVariable = msnEprMr + msnLlpMr + msnApuMr

    // Spare parts = totalBH × spare parts rate + tires/wheels fixed
    const msnSpareParts = msnTotalBh * sparePartsRatePerBh + tiresWheelsCost

    const msnCfg: PnlLineConfig = {
      maintReservesVariable: msnMaintReservesVariable,
      leaseRentEur: parseFloat(input.leaseRentEur || '0'),
      maintReservesFixedEur: calcMaintFixed(input),
      pilotPerDiem: msnPilotPerDiem,
      cabinCrewPerDiem: msnCabinCrewPerDiem,
      accomTravelC: accomTravelCPerMonth,
      pilotSalary: msnPilotSalary,
      cabinCrewSalary: msnCabinCrewSalary,
      staffUniformF: uniformPerMonth,
      trainingC: trainingPerMonth,
      spareParts: msnSpareParts,
      maintPersonnelPerDiem: maintPerDiemVal,
      lineMaintenance: lineMaintenanceVal,
      baseMaintenance: baseMaintenanceVal,
      maintPersonnelSalary: maintPersonnelSalaryVal,
      trainningM: trainningVal,
      maintCCheck: cCheckVal,
      insuranceFixed: msnInsurance,
      technical: technicalVal,
      otherFixed: otherFixedVal,
      personnelCostSS: overheadPerMonth[0] ?? 0,
      personnelCost: (overheadPerMonth[1] ?? 0) + commissionMxcRate * msnTotalBh,
      travelExpenses: overheadPerMonth[2] ?? 0,
      legalExpenses: overheadPerMonth[3] ?? 0,
      licenseRegCost: overheadPerMonth[4] ?? 0,
      adminCost: overheadPerMonth[5] ?? 0,
      itComms: overheadPerMonth[6] ?? 0,
      adminGeneralExp: overheadPerMonth[7] ?? 0,
      sellingMarketingCost: overheadPerMonth[8] ?? 0,
      fuel: fuelVal,
      handling: handlingVal,
      navigation: navigationVal,
      airportCharges: airportChargesVal,
      commissionSummerRate,
      commissionWinterRate,
    }

    return {
      mgh: msnMgh, acmiRate: msnAcmiRate, excessBh: msnExcessBh,
      excessHourRate: msnExcessHourRate, cycleRatio: msnCycleRatio,
      bhFhRatio: msnBhFhRatio, apuFhRatio: msnApuFhRatio, cfg: msnCfg,
    }
  }

  // All data keys for initialization
  const ALL_DATA_KEYS = [
    ...VARIABLE_COST_KEYS, ...FIXED_COST_KEYS, ...OVERHEAD_KEYS,
    'wetLease', 'otherRevenue', 'financeIncome',
    'totalRevenue', 'totalVariableCost', 'contributionI',
    'totalFixedCost', 'contributionII', 'totalOverhead',
    'ebitda', 'ebitdaMargin', 'depAmort', 'ebit', 'ebitMargin',
    'interestNet', 'fxNet', 'tax', 'netProfit', 'netProfitMargin',
    'acOperational', 'bh', 'avgBhPerAc', 'fh', 'fc', 'fhFcRatio', 'apuFh',
  ]

  let monthlyData: Record<string, number[]>

  if (selectedMsn !== null) {
    // ── Single MSN view ──
    const input = msnInputs.find((i) => i.msn === selectedMsn)
    if (input) {
      const r = computeForMsn(input)
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
    // ── Total project — compute each MSN independently and sum per month ──
    monthlyData = {}
    for (const k of ALL_DATA_KEYS) {
      monthlyData[k] = new Array(months.length).fill(0)
    }

    for (const input of msnInputs) {
      const r = computeForMsn(input)
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

  // Empty state
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
                        {fmt(v)}
                      </td>
                    ))}
                    <td className={`text-right px-3 py-1.5 font-mono font-semibold text-gray-900 dark:text-gray-100 ${dataColWidth} border-l border-gray-300 dark:border-gray-700 ${valColor(total)}`}>
                      {fmt(total)}
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
                        {fmt(v)}
                      </td>
                    ))}
                    <td className={`text-right px-3 py-2 font-mono font-bold ${dataColWidth} border-l border-gray-300 dark:border-gray-700 ${total < 0 ? 'text-red-400' : 'text-green-400'}`}>
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
                        {isKpiDec ? fmtDec(v, 2) : fmt(v)}
                      </td>
                    ))}
                    <td className={`text-right px-3 py-1 font-mono text-gray-700 dark:text-gray-300 ${dataColWidth} border-l border-gray-300 dark:border-gray-700`}>
                      {isKpiDec ? fmtDec(kpiTotal / Math.max(months.length, 1), 2) : fmt(kpiTotal)}
                    </td>
                  </tr>
                )
              }

              // Regular item rows
              return (
                <tr key={idx} className="hover:bg-gray-100/20 dark:bg-gray-800/20">
                  <td className={`sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-1 text-gray-700 dark:text-gray-300 pl-8 ${labelColWidth}`}>
                    {row.label}
                  </td>
                  {(vals ?? []).map((v, mi) => (
                    <td key={mi} className={`text-right px-3 py-1 font-mono text-gray-700 dark:text-gray-300 ${dataColWidth} ${valColor(v)}`}>
                      {fmt(v)}
                    </td>
                  ))}
                  <td className={`text-right px-3 py-1 font-mono text-gray-700 dark:text-gray-300 ${dataColWidth} border-l border-gray-300 dark:border-gray-700 ${valColor(total)}`}>
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
