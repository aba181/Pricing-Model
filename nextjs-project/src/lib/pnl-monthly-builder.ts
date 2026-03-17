/**
 * Monthly P&L data builder.
 *
 * Builds a Record<string, number[]> mapping each P&L line key to an array
 * of monthly values. Pure computation — no React, no side effects.
 */

import { VARIABLE_COST_KEYS, FIXED_COST_KEYS, OVERHEAD_KEYS, ALL_DATA_KEYS } from './pnl-row-defs'

/** All derived config values that feed into P&L line items */
export interface PnlLineConfig {
  // A component — variable (from Aircraft tab + KPIs)
  maintReservesVariable: number // EPR MR + LLP MR + APU MR (monthly, EUR)
  eprMr: number   // EPR maintenance reserve sub-component (EUR)
  llpMr: number   // LLP maintenance reserve sub-component (EUR)
  apuMr: number   // APU maintenance reserve sub-component (EUR)
  // A component — fixed (from Aircraft tab)
  leaseRentEur: number
  maintReservesFixedEur: number
  // C component — variable (from Crew tab)
  pilotPerDiem: number      // (pilot per diem per set x crewSets) + BH bonus
  cabinCrewPerDiem: number  // depends on leaseType + aircraftType x crewSets
  accomTravelC: number      // (travel costs + accommodation) / avgAC / 12
  // C component — fixed (from Crew tab)
  pilotSalary: number       // (pilot SS + copilot SS) x crewSets
  cabinCrewSalary: number   // depends on leaseType + aircraftType
  staffUniformF: number     // uniform per month (per AC)
  trainingC: number         // training total per month (per AC)
  // M component — variable (from Costs tab + KPIs)
  spareParts: number        // BH x spare parts rate + tires/wheels fixed
  maintPersonnelPerDiem: number // sum of (engineers x perDiem x days) from maint personnel
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
  commissionSummerRate: number // Nov-Apr: rate x BH
  commissionWinterRate: number // May-Oct: rate x BH
  // -- Sub-components for drill-down popovers --
  pilotPerDiem_perDiem: number    // per diem component (pilotPerDiemPerSet × crewSets)
  pilotPerDiem_bhBonus: number    // BH bonus component (bhBonusPerBh × totalBH)
  cabinCrewPerDiem_cabinAtt: number  // cabin attendant per diem portion
  cabinCrewPerDiem_seniorAtt: number // senior attendant per diem portion
  spareParts_bh: number           // BH-based spare parts (totalBH × rate)
  spareParts_tiresWheels: number  // tires/wheels fixed cost
  maintReservesFixed_6yr: number  // 6-year check
  maintReservesFixed_12yr: number // 12-year check
  maintReservesFixed_ldg: number  // landing gear
  pilotSalary_pilot: number       // pilot SS × crewSets
  pilotSalary_copilot: number     // copilot SS × crewSets
  cabinCrewSalary_cabinAtt: number   // cabin attendant SS portion
  cabinCrewSalary_seniorAtt: number  // senior attendant SS portion
  lineMaintenance_internal: number   // Line Maintenance - Internal
  lineMaintenance_3rdParty: number   // Line Maintenance - 3rd Party
}

/**
 * Build monthly P&L data arrays for a single MSN.
 *
 * Returns a Record mapping each data key to an array of monthly values.
 */
export function buildMonthlyData(
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
  for (const k of ALL_DATA_KEYS) {
    data[k] = new Array(monthCount).fill(0)
  }

  if (mgh === 0) return data

  // Revenue = (ACMI Rate x MGH) + (Excess BH x Excess Hour Rate)
  const revenue = acmiRate * mgh + excessBh * excessHourRate
  const totalBh = mgh + excessBh

  for (let m = 0; m < monthCount; m++) {
    // Revenue
    data['wetLease'][m] = revenue
    data['otherRevenue'][m] = 0
    data['financeIncome'][m] = 0
    data['totalRevenue'][m] = revenue

    // -- VARIABLE COST --
    // A: reserves variable (EPR MR + LLP MR + APU MR) from Aircraft tab
    data['maintReservesVariable'][m] = cfg.maintReservesVariable
    data['maintReservesVariable_epr'][m] = cfg.eprMr
    data['maintReservesVariable_llp'][m] = cfg.llpMr
    data['maintReservesVariable_apu'][m] = cfg.apuMr
    data['assetMgmtFee'][m] = 0

    // C: per diems (from Crew tab)
    data['pilotPerDiem'][m] = cfg.pilotPerDiem
    data['pilotPerDiem_perDiem'][m] = cfg.pilotPerDiem_perDiem
    data['pilotPerDiem_bhBonus'][m] = cfg.pilotPerDiem_bhBonus
    data['cabinCrewPerDiem'][m] = cfg.cabinCrewPerDiem
    data['cabinCrewPerDiem_cabinAtt'][m] = cfg.cabinCrewPerDiem_cabinAtt
    data['cabinCrewPerDiem_seniorAtt'][m] = cfg.cabinCrewPerDiem_seniorAtt
    data['accomTravelC'][m] = cfg.accomTravelC

    // M: variable maintenance (from Costs tab)
    data['spareParts'][m] = cfg.spareParts
    data['spareParts_bh'][m] = cfg.spareParts_bh
    data['spareParts_tiresWheels'][m] = cfg.spareParts_tiresWheels
    data['maintPersonnelPerDiem'][m] = cfg.maintPersonnelPerDiem
    data['accomTravelM'][m] = 0
    data['otherMaintV'][m] = 0

    // DOC: from Costs tab
    data['fuel'][m] = cfg.fuel
    data['handling'][m] = cfg.handling
    data['navigation'][m] = cfg.navigation
    data['airportCharges'][m] = cfg.airportCharges

    // Other COGS: commissions = rate x totalBH, rate depends on calendar month
    // May-Oct -> winter rate, Nov-Apr -> summer rate
    const calMonth = months[m].month
    const isSummer = calMonth >= 5 && calMonth <= 10 // May(5) - Oct(10)
    data['commissions'][m] = (isSummer ? cfg.commissionWinterRate : cfg.commissionSummerRate) * totalBh
    data['delaysCancellations'][m] = 0

    // Total variable cost
    const totalVar = VARIABLE_COST_KEYS.reduce((s, k) => s + data[k][m], 0)
    data['totalVariableCost'][m] = totalVar
    data['contributionI'][m] = revenue - totalVar

    // -- FIXED COST --
    // A: from Aircraft tab rates
    data['dryLease'][m] = cfg.leaseRentEur
    data['maintReservesFixed'][m] = cfg.maintReservesFixedEur
    data['maintReservesFixed_6yr'][m] = cfg.maintReservesFixed_6yr
    data['maintReservesFixed_12yr'][m] = cfg.maintReservesFixed_12yr
    data['maintReservesFixed_ldg'][m] = cfg.maintReservesFixed_ldg

    // C: from Crew tab
    data['pilotSalary'][m] = cfg.pilotSalary
    data['pilotSalary_pilot'][m] = cfg.pilotSalary_pilot
    data['pilotSalary_copilot'][m] = cfg.pilotSalary_copilot
    data['cabinCrewSalary'][m] = cfg.cabinCrewSalary
    data['cabinCrewSalary_cabinAtt'][m] = cfg.cabinCrewSalary_cabinAtt
    data['cabinCrewSalary_seniorAtt'][m] = cfg.cabinCrewSalary_seniorAtt
    data['staffUniformF'][m] = cfg.staffUniformF
    data['trainingC'][m] = cfg.trainingC

    // M: from Costs tab
    data['lineMaintenance'][m] = cfg.lineMaintenance
    data['lineMaintenance_internal'][m] = cfg.lineMaintenance_internal
    data['lineMaintenance_3rdParty'][m] = cfg.lineMaintenance_3rdParty
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

    // -- OVERHEAD -- from Costs tab (per month per AC)
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
