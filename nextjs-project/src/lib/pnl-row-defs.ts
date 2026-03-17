/**
 * P&L row definitions and cost key arrays.
 *
 * Defines the exact structure of the P&L table rows, mirroring the Excel model.
 * Pure data — no React, no side effects.
 */

export type RowKind =
  | 'section'       // e.g. "REVENUE", "VARIABLE COST"
  | 'category'      // e.g. "A", "C", "M", "DOC", "I", "Other"
  | 'item'          // regular line item
  | 'total'         // subtotal row (bold, top border)
  | 'result'        // profit/EBITDA/EBIT rows (bold, top border, background)
  | 'margin'        // percentage row
  | 'kpi-header'    // KPI's section header
  | 'kpi'           // KPI item

export interface PnlRowDef {
  kind: RowKind
  label: string
  /** Key into the monthly values object, or undefined for section/category rows */
  key?: string
}

// The exact P&L structure from the Excel
export const PNL_ROWS: PnlRowDef[] = [
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

// Cost key arrays for subtotal calculations
export const VARIABLE_COST_KEYS = [
  'maintReservesVariable', 'assetMgmtFee',
  'pilotPerDiem', 'cabinCrewPerDiem', 'accomTravelC',
  'spareParts', 'maintPersonnelPerDiem', 'accomTravelM', 'otherMaintV',
  'fuel', 'handling', 'navigation', 'airportCharges',
  'commissions', 'delaysCancellations',
]

export const FIXED_COST_KEYS = [
  'dryLease', 'maintReservesFixed',
  'pilotSalary', 'cabinCrewSalary', 'staffUniformF', 'trainingC',
  'lineMaintenance', 'baseMaintenance', 'maintPersonnelSalary', 'trainningM', 'maintCCheck',
  'insuranceFixed',
  'technical', 'otherFixed',
]

export const OVERHEAD_KEYS = [
  'personnelCostSS', 'personnelCost', 'travelExpenses', 'legalExpenses',
  'licenseRegCost', 'adminCost', 'itComms', 'adminGeneralExp', 'sellingMarketingCost',
]

// Keys that display as margin percentages
export const MARGIN_KEYS = new Set(['ebitdaMargin', 'ebitMargin', 'netProfitMargin'])

// KPI keys that display with decimal formatting
export const KPI_DECIMAL_KEYS = new Set(['fhFcRatio', 'avgBhPerAc'])

// All data keys (for initialization and aggregation)
export const ALL_DATA_KEYS = [
  ...VARIABLE_COST_KEYS,
  ...FIXED_COST_KEYS,
  ...OVERHEAD_KEYS,
  'maintReservesVariable_epr', 'maintReservesVariable_llp', 'maintReservesVariable_apu',
  'wetLease', 'otherRevenue', 'financeIncome',
  'totalRevenue', 'totalVariableCost', 'contributionI',
  'totalFixedCost', 'contributionII', 'totalOverhead',
  'ebitda', 'ebitdaMargin', 'depAmort', 'ebit', 'ebitMargin',
  'interestNet', 'fxNet', 'tax', 'netProfit', 'netProfitMargin',
  'acOperational', 'bh', 'avgBhPerAc', 'fh', 'fc', 'fhFcRatio', 'apuFh',
]
