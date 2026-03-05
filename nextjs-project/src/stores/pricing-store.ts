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
  periodMonths: number
  leaseType: 'wet' | 'damp' | 'moist'
  crewSets: number
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
