'use client'

import { useState } from 'react'
import { X, RefreshCw } from 'lucide-react'
import type { MsnInput } from '@/stores/pricing-store'
import { usePricingStore } from '@/stores/pricing-store'
import type { AircraftOption } from '@/lib/api-converters'

interface MsnInputRowProps {
  input: MsnInput
  onUpdate: (msn: number, field: keyof MsnInput, value: string | number) => void
  onRemove: (msn: number) => void
  aircraftList: AircraftOption[]
  usedMsns: number[]
}

const inputCls =
  'w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-1.5 py-0.5 text-[11px] text-gray-900 dark:text-gray-100 focus:border-indigo-400 focus:outline-none'
const selectCls =
  'w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-1 py-0.5 text-[11px] text-gray-900 dark:text-gray-100 focus:border-indigo-400 focus:outline-none'
const labelCls = 'text-[10px] text-gray-400 dark:text-gray-500 leading-tight'

export function MsnInputRow({ input, onUpdate, onRemove, aircraftList, usedMsns }: MsnInputRowProps) {
  const [showSwap, setShowSwap] = useState(false)
  const { swapMsnAircraft } = usePricingStore()

  // Aircraft available for swap: not already used, or is the current one
  const swapOptions = aircraftList.filter(
    (ac) => ac.msn === input.msn || !usedMsns.includes(ac.msn)
  )

  const handleSwap = (aircraftId: string) => {
    const ac = aircraftList.find((a) => a.id === Number(aircraftId))
    if (!ac || ac.msn === input.msn) {
      setShowSwap(false)
      return
    }
    swapMsnAircraft(input.msn, {
      aircraftId: ac.id,
      msn: ac.msn,
      aircraftType: ac.aircraft_type,
      registration: ac.registration,
      leaseRentEur: ac.lease_rent_eur ?? '0',
      sixYearCheckEur: ac.six_year_check_eur ?? '0',
      twelveYearCheckEur: ac.twelve_year_check_eur ?? '0',
      ldgEur: ac.ldg_eur ?? '0',
      apuRateUsd: ac.apu_rate_usd ?? '0',
      llp1RateUsd: ac.llp1_rate_usd ?? '0',
      llp2RateUsd: ac.llp2_rate_usd ?? '0',
      eprMatrix: (ac.epr_matrix ?? []).map((r) => ({
        cycleRatio: parseFloat(r.cycle_ratio),
        benignRate: parseFloat(r.benign_rate),
        hotRate: parseFloat(r.hot_rate),
      })),
    })
    setShowSwap(false)
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-300 dark:border-gray-700/50 px-2.5 py-2">
      {/* Card header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            MSN {input.msn}
          </span>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            {input.aircraftType}
          </span>
          {input.registration && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              ({input.registration})
            </span>
          )}
          {showSwap ? (
            <select
              autoFocus
              defaultValue={String(input.aircraftId)}
              onChange={(e) => handleSwap(e.target.value)}
              onBlur={() => setShowSwap(false)}
              className="bg-white dark:bg-gray-900 border border-indigo-400 rounded px-1.5 py-0.5 text-[11px] text-gray-900 dark:text-gray-100 focus:outline-none"
            >
              {swapOptions.map((ac) => (
                <option key={ac.id} value={ac.id}>
                  MSN {ac.msn} - {ac.aircraft_type}
                  {ac.registration ? ` (${ac.registration})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <button
              onClick={() => setShowSwap(true)}
              className="p-0.5 text-gray-400 dark:text-gray-500 hover:text-indigo-400 transition-colors rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Change aircraft"
              title="Change aircraft"
            >
              <RefreshCw size={11} />
            </button>
          )}
        </div>
        <button
          onClick={() => onRemove(input.msn)}
          className="p-0.5 text-gray-400 dark:text-gray-500 hover:text-red-400 transition-colors rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label={`Remove MSN ${input.msn}`}
        >
          <X size={12} />
        </button>
      </div>

      {/* Input grid — 3 columns */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-1">
        {/* MGH */}
        <div>
          <label className={labelCls}>MGH</label>
          <input
            type="number"
            step="0.01"
            value={input.mgh}
            onChange={(e) => onUpdate(input.msn, 'mgh', e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Cycle Ratio */}
        <div>
          <label className={labelCls}>FH:FC</label>
          <input
            type="number"
            step="0.0001"
            value={input.cycleRatio}
            onChange={(e) => onUpdate(input.msn, 'cycleRatio', e.target.value)}
            className={inputCls}
          />
        </div>

        {/* ACMI Rate */}
        <div>
          <label className={labelCls}>ACMI Rate</label>
          <input
            type="number"
            step="0.01"
            value={input.acmiRate}
            onChange={(e) => onUpdate(input.msn, 'acmiRate', e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Excess Hour Rate */}
        <div>
          <label className={labelCls}>Excess Hour Rate</label>
          <input
            type="number"
            step="0.01"
            value={input.excessHourRate}
            onChange={(e) => onUpdate(input.msn, 'excessHourRate', e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Period Start */}
        <div>
          <label className={labelCls}>Start Date</label>
          <input
            type="date"
            value={input.periodStart.length === 7 ? `${input.periodStart}-01` : input.periodStart}
            onChange={(e) => onUpdate(input.msn, 'periodStart', e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Period End */}
        <div>
          <label className={labelCls}>End Date</label>
          <input
            type="date"
            value={(() => {
              if (input.periodEnd.length > 7) return input.periodEnd
              // YYYY-MM → append last day of month
              const [y, m] = input.periodEnd.split('-').map(Number)
              const lastDay = new Date(y, m, 0).getDate()
              return `${input.periodEnd}-${String(lastDay).padStart(2, '0')}`
            })()}
            onChange={(e) => onUpdate(input.msn, 'periodEnd', e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Excess BH */}
        <div>
          <label className={labelCls}>Excess Hour</label>
          <input
            type="number"
            step="0.01"
            value={input.excessBh}
            onChange={(e) => onUpdate(input.msn, 'excessBh', e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Environment */}
        <div>
          <label className={labelCls}>Environment</label>
          <select
            value={input.environment}
            onChange={(e) => onUpdate(input.msn, 'environment', e.target.value)}
            className={selectCls}
          >
            <option value="benign">Benign</option>
            <option value="hot">Hot</option>
          </select>
        </div>

        {/* Crew Sets */}
        <div>
          <label className={labelCls}>Crew</label>
          <input
            type="number"
            min={1}
            value={input.crewSets}
            onChange={(e) => onUpdate(input.msn, 'crewSets', parseInt(e.target.value) || 1)}
            className={inputCls}
          />
        </div>

        {/* Lease Type */}
        <div>
          <label className={labelCls}>Lease Type</label>
          <select
            value={input.leaseType}
            onChange={(e) => onUpdate(input.msn, 'leaseType', e.target.value)}
            className={selectCls}
          >
            <option value="wet">Wet</option>
            <option value="damp">Damp</option>
            <option value="moist">Moist</option>
          </select>
        </div>
      </div>
    </div>
  )
}
