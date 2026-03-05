import { create } from 'zustand'

// ---- Types ----

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
  acmiRate: string // EUR per BH — revenue = acmiRate × MGH
  bhFhRatio: string // BH:FH ratio — FH = BH / bhFhRatio (default 1.2)
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
  addMsnInput: (input: MsnInput) => void
  removeMsnInput: (msn: number) => void
  updateMsnInput: (msn: number, field: keyof MsnInput, value: string | number | null) => void
  setSelectedMsn: (msn: number | null) => void
  setResults: (msnResults: MsnPnlResult[], total: ComponentBreakdown | null) => void
  setIsCalculating: (val: boolean) => void
  setLastError: (err: string | null) => void
  reset: () => void
}

const initialState = {
  projectId: null as number | null,
  projectName: '',
  exchangeRate: '0.85',
  marginPercent: '0',
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
}))
