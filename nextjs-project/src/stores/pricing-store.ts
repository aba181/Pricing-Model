import { create } from 'zustand'

// ---- Types ----

/** EPR matrix row from aircraft tab — rates are USD per engine */
export interface EprMatrixRow {
  cycleRatio: number
  benignRate: number
  hotRate: number
}

export interface MsnInput {
  id?: number // DB id (from project_msn_inputs)
  aircraftId: number
  msn: number
  aircraftType: string // "A320" or "A321"
  registration: string | null
  mgh: string // String to preserve decimal precision
  cycleRatio: string
  environment: 'benign' | 'hot'
  periodStart: string // "YYYY-MM" format
  periodEnd: string // "YYYY-MM" format
  leaseType: 'wet' | 'damp' | 'moist'
  crewSets: number
  acmiRate: string // EUR per BH — revenue = (acmiRate × MGH) + (excessBh × excessHourRate)
  excessBh: string // Excess BH above MGH (default 0)
  excessHourRate: string // EUR per excess BH (default 0)
  bhFhRatio: string // BH:FH ratio — FH = BH / bhFhRatio (default 1.2)
  apuFhRatio: string // APU FH:FH ratio — APU FH = FH * apuFhRatio (default 1.1)
  // Aircraft rates from Aircraft tab (EUR, monthly — fixed)
  leaseRentEur: string // Dry lease rent per month
  sixYearCheckEur: string // 6-year check reserve per month
  twelveYearCheckEur: string // 12-year check reserve per month
  ldgEur: string // Landing gear reserve per month
  // Aircraft rates from Aircraft tab (USD — variable, per engine)
  apuRateUsd: string  // APU rate per APU FH
  llp1RateUsd: string // LLP #1 rate per FC
  llp2RateUsd: string // LLP #2 rate per FC
  // EPR matrix from Aircraft tab (USD per engine)
  eprMatrix: EprMatrixRow[]
}

/** Compute period in months from start/end YYYY-MM strings (inclusive) */
export function computePeriodMonths(start: string, end: string): number {
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  if (!sy || !sm || !ey || !em) return 1
  const months = (ey - sy) * 12 + (em - sm) + 1
  return Math.max(1, months)
}

/** Generate an array of {year, month} for each month from start to end (inclusive) */
export function generateMonthRange(start: string, end: string): { year: number; month: number; label: string }[] {
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  if (!sy || !sm || !ey || !em) return []
  const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const result: { year: number; month: number; label: string }[] = []
  let y = sy
  let m = sm
  while (y < ey || (y === ey && m <= em)) {
    result.push({ year: y, month: m, label: MONTH_LABELS[m - 1] })
    m++
    if (m > 12) { m = 1; y++ }
  }
  return result
}

export interface ComponentBreakdown {
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
}

export interface MsnPnlResult {
  msn: number
  aircraftType: string
  breakdown: ComponentBreakdown
  monthlyCost: string
  monthlyRevenue: string
  monthlyPnl: string
}

interface PricingStore {
  // Project state
  projectId: number | null
  projectName: string
  exchangeRate: string // Default "0.85"
  marginPercent: string // Default "0"
  bhFhRatio: string // Global BH:FH ratio — FH = BH / bhFhRatio (default 1.2)
  apuFhRatio: string // Global APU FH:FH ratio — APU FH = FH * apuFhRatio (default 1.1)
  msnInputs: MsnInput[]

  // P&L results
  selectedMsn: number | null // null = total project view
  msnResults: MsnPnlResult[]
  totalResult: ComponentBreakdown | null
  isCalculating: boolean
  lastError: string | null

  // Actions
  setProjectId: (id: number | null) => void
  setProjectName: (name: string) => void
  setExchangeRate: (rate: string) => void
  setMarginPercent: (margin: string) => void
  setBhFhRatio: (ratio: string) => void
  setApuFhRatio: (ratio: string) => void
  addMsnInput: (input: MsnInput) => void
  removeMsnInput: (msn: number) => void
  updateMsnInput: (msn: number, field: keyof MsnInput, value: string | number | null) => void
  setSelectedMsn: (msn: number | null) => void
  setResults: (msnResults: MsnPnlResult[], total: ComponentBreakdown | null) => void
  setIsCalculating: (val: boolean) => void
  setLastError: (err: string | null) => void
  reset: () => void
  loadFromQuote: (quoteData: {
    dashboardState: {
      projectName?: string
      exchangeRate: string
      marginPercent: string
      bhFhRatio?: string
      apuFhRatio?: string
    }
    msnInputs: MsnInput[]
    msnResults: MsnPnlResult[]
    totalResult: ComponentBreakdown | null
  }) => void
}

const initialState = {
  projectId: null as number | null,
  projectName: '',
  exchangeRate: '0.85',
  marginPercent: '0',
  bhFhRatio: '1.2',
  apuFhRatio: '1.1',
  msnInputs: [] as MsnInput[],
  selectedMsn: null as number | null,
  msnResults: [] as MsnPnlResult[],
  totalResult: null as ComponentBreakdown | null,
  isCalculating: false,
  lastError: null as string | null,
}

export const usePricingStore = create<PricingStore>()((set) => ({
  ...initialState,

  setProjectId: (id) => set({ projectId: id }),
  setProjectName: (name) => set({ projectName: name }),
  setExchangeRate: (rate) => set({ exchangeRate: rate }),
  setMarginPercent: (margin) => set({ marginPercent: margin }),
  setBhFhRatio: (ratio) => set({ bhFhRatio: ratio }),
  setApuFhRatio: (ratio) => set({ apuFhRatio: ratio }),

  addMsnInput: (input) =>
    set((state) => ({
      msnInputs: [...state.msnInputs, input],
    })),

  removeMsnInput: (msn) =>
    set((state) => ({
      msnInputs: state.msnInputs.filter((i) => i.msn !== msn),
    })),

  updateMsnInput: (msn, field, value) =>
    set((state) => ({
      msnInputs: state.msnInputs.map((i) =>
        i.msn === msn ? { ...i, [field]: value } : i
      ),
    })),

  setSelectedMsn: (msn) => set({ selectedMsn: msn }),

  setResults: (msnResults, total) => set({ msnResults, totalResult: total }),

  setIsCalculating: (val) => set({ isCalculating: val }),

  setLastError: (err) => set({ lastError: err }),

  reset: () => set({ ...initialState }),

  loadFromQuote: (quoteData) =>
    set({
      projectId: null, // Fork: new working copy, not linked to original
      projectName: quoteData.dashboardState.projectName ?? '',
      exchangeRate: quoteData.dashboardState.exchangeRate,
      marginPercent: quoteData.dashboardState.marginPercent,
      bhFhRatio: quoteData.dashboardState.bhFhRatio ?? '1.2',
      apuFhRatio: quoteData.dashboardState.apuFhRatio ?? '1.1',
      msnInputs: quoteData.msnInputs,
      msnResults: quoteData.msnResults,
      totalResult: quoteData.totalResult,
      selectedMsn: null,
      isCalculating: false,
      lastError: null,
    }),
}))
