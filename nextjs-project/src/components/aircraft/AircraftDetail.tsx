'use client'

import { RatesSection } from '@/components/aircraft/RatesSection'
import { EprMatrixTable } from '@/components/aircraft/EprMatrixTable'
import type { RateRow } from '@/components/aircraft/RatesSection'
import type { EprMatrixRow } from '@/components/aircraft/EprMatrixTable'

export interface AircraftDetailData {
  id: number
  msn: number
  aircraft_type: string
  registration: string | null
  lease_rent_usd: string
  six_year_check_usd: string
  twelve_year_check_usd: string
  ldg_usd: string
  apu_rate_usd: string
  llp1_rate_usd: string
  llp2_rate_usd: string
  epr_escalation: string
  llp_escalation: string
  af_apu_escalation: string
  lease_rent_eur: string
  six_year_check_eur: string
  twelve_year_check_eur: string
  ldg_eur: string
  apu_rate_eur: string
  llp1_rate_eur: string
  llp2_rate_eur: string
  epr_matrix: EprMatrixRow[]
}

function formatEscalation(value: string | number | null): string {
  if (value === null || value === undefined) return '-'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '-'
  return `${(num * 100).toFixed(1)}%`
}

export function AircraftDetail({
  aircraft,
  isAdmin,
}: {
  aircraft: AircraftDetailData
  isAdmin: boolean
}) {
  const fixedRates: RateRow[] = [
    { label: 'Lease Rent', usd: aircraft.lease_rent_usd, eur: aircraft.lease_rent_eur, field: 'lease_rent_usd' },
    { label: '6-Year Check', usd: aircraft.six_year_check_usd, eur: aircraft.six_year_check_eur, field: 'six_year_check_usd' },
    { label: '12-Year Check', usd: aircraft.twelve_year_check_usd, eur: aircraft.twelve_year_check_eur, field: 'twelve_year_check_usd' },
    { label: 'Landing Gear (LDG)', usd: aircraft.ldg_usd, eur: aircraft.ldg_eur, field: 'ldg_usd' },
  ]

  const variableRates: RateRow[] = [
    { label: 'APU Rate', usd: aircraft.apu_rate_usd, eur: aircraft.apu_rate_eur, field: 'apu_rate_usd' },
    { label: 'LLP #1 Rate', usd: aircraft.llp1_rate_usd, eur: aircraft.llp1_rate_eur, field: 'llp1_rate_usd' },
    { label: 'LLP #2 Rate', usd: aircraft.llp2_rate_usd, eur: aircraft.llp2_rate_eur, field: 'llp2_rate_usd' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-baseline gap-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">MSN {aircraft.msn}</h1>
          <span className="text-lg text-gray-500 dark:text-gray-400">{aircraft.aircraft_type}</span>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {aircraft.registration ?? 'No registration'}
        </p>
      </div>

      {/* Fixed Monthly Rates */}
      <RatesSection
        title="Fixed Monthly Rates"
        rates={fixedRates}
        msn={aircraft.msn}
        isAdmin={isAdmin}
      />

      {/* Variable Rates (per engine) */}
      <RatesSection
        title="Variable Rates (per engine)"
        rates={variableRates}
        msn={aircraft.msn}
        isAdmin={isAdmin}
      />

      {/* Escalation Rates */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Escalation Rates</h3>
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_120px] gap-2 text-xs text-gray-400 dark:text-gray-500 px-1 pb-1 border-b border-gray-200 dark:border-gray-800">
            <span>Parameter</span>
            <span className="text-right">Rate</span>
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-2 py-1.5 px-1">
            <span className="text-sm text-gray-700 dark:text-gray-300">EPR Escalation</span>
            <span className="text-sm text-gray-700 dark:text-gray-300 text-right">
              {formatEscalation(aircraft.epr_escalation)}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-2 py-1.5 px-1">
            <span className="text-sm text-gray-700 dark:text-gray-300">LLP Escalation</span>
            <span className="text-sm text-gray-700 dark:text-gray-300 text-right">
              {formatEscalation(aircraft.llp_escalation)}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-2 py-1.5 px-1">
            <span className="text-sm text-gray-700 dark:text-gray-300">AF+APU Escalation</span>
            <span className="text-sm text-gray-700 dark:text-gray-300 text-right">
              {formatEscalation(aircraft.af_apu_escalation)}
            </span>
          </div>
        </div>
      </div>

      {/* EPR Matrix */}
      <EprMatrixTable eprMatrix={aircraft.epr_matrix} msn={aircraft.msn} isAdmin={isAdmin} />
    </div>
  )
}
