'use client'

import { useState } from 'react'
import { usePricingStore } from '@/stores/pricing-store'
import type { MsnInput, SeasonInput } from '@/stores/pricing-store'
import { startDateValue, endDateValue, durationText } from '@/components/pricing/MsnInputRow'
import { useCanViewNaked } from '@/providers/CostVisibilityProvider'

/** Read-only labeled value, styled like the workspace's input fields. */
function Ro({ label, value }: { label: string; value: string }) {
  return (
    <div className="av-nf">
      <label>{label}</label>
      <div className="av-ro av-num">{value || '—'}</div>
    </div>
  )
}

/** Segmented control bound to a value (same look as the workspace's View cluster). */
function Sg({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="av-nf">
      <label>{label}</label>
      <div className="av-seg">
        {options.map((o) => (
          <button key={o.value} type="button" className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—')

/**
 * Read-only deal-parameter rail for the quote summary page — the same data the
 * Pricing Workspace's input deck shows (utilisation, rate, term, operation),
 * plus the interactive View cluster (results scope / currency / cost basis),
 * so the summary page presents exactly what the edit dialog does. Values come
 * from the pricing store hydrated with the quote's snapshot.
 */
export function QuoteParamsRail() {
  const {
    msnInputs,
    selectedMsn,
    setSelectedMsn,
    displayCurrency,
    setDisplayCurrency,
    rateBasis,
    setRateBasis,
  } = usePricingStore()
  const canViewNaked = useCanViewNaked()

  const [activeMsn, setActiveMsn] = useState<number | null>(null)
  const [season, setSeason] = useState<'summer' | 'winter'>('summer')

  if (msnInputs.length === 0) return null

  const input: MsnInput =
    msnInputs.find((i) => i.msn === activeMsn) ?? msnInputs[0]

  const seasonal = input.seasonalityEnabled && input.summer && input.winter
  const data: SeasonInput = seasonal
    ? (season === 'summer' ? input.summer! : input.winter!)
    : (input as unknown as SeasonInput)

  const currencyLabel = (input.rateCurrency ?? 'eur').toUpperCase()
  const mghLabel =
    (input.mghMode ?? 'month') === 'period' ? 'Guaranteed BH (period)' : 'Min guaranteed hours'

  return (
    <div className="av-deck">
      {/* MSN tabs (multi-aircraft quotes) — inside the card, same underline
          style as the season tabs, so the rail reads as one clean panel. */}
      {msnInputs.length > 1 && (
        <div className="av-deck-seasons">
          {msnInputs.map((i) => (
            <button
              key={i.msn}
              onClick={() => setActiveMsn(i.msn)}
              className={i.msn === input.msn ? 'on' : ''}
            >
              MSN <span className="av-num">{i.msn}</span>
            </button>
          ))}
        </div>
      )}

      {seasonal && (
        <div className="av-deck-seasons">
          <button className={season === 'summer' ? 'on' : ''} onClick={() => setSeason('summer')}>Summer</button>
          <button className={season === 'winter' ? 'on' : ''} onClick={() => setSeason('winter')}>Winter</button>
        </div>
      )}
        <div className="av-deck-grid">
          {/* ── Aircraft ── */}
          <div className="av-cluster">
            <div className="av-cluster-t">Aircraft</div>
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>MSN {input.msn}</span>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--ink-2)' }}>{input.aircraftType}</span>
              {input.registration && (
                <span className="text-[10.5px]" style={{ color: 'var(--muted)' }}>({input.registration})</span>
              )}
            </div>
            {(input.seasonalityEnabled || input.fixedCostCoverageEnabled) && (
              <div className="flex gap-1.5 av-mt8" style={{ flexWrap: 'wrap' }}>
                {input.seasonalityEnabled && <span className="av-chip-t on">Seasonality</span>}
                {input.fixedCostCoverageEnabled && <span className="av-chip-t on">FC Coverage</span>}
              </div>
            )}
          </div>

          {/* ── Utilisation ── */}
          <div className="av-cluster">
            <div className="av-cluster-t">Utilisation</div>
            <Ro label={mghLabel} value={String(data.mgh ?? '')} />
            <div className="av-gd2 av-mt8">
              <Ro label="Excess hours" value={String(data.excessBh ?? '')} />
              <Ro label="FH : FC" value={String(data.cycleRatio ?? '')} />
            </div>
          </div>

          {/* ── Rate ── */}
          <div className="av-cluster">
            <div className="av-cluster-t">Rate</div>
            <Ro label={`ACMI rate · ${currencyLabel}/BH`} value={String(data.acmiRate ?? '')} />
            <div className="av-gd2 av-mt8">
              <Ro label={`Excess rate (${currencyLabel})`} value={String(data.excessHourRate ?? '')} />
              <div />
            </div>
          </div>

          {/* ── Term ── */}
          <div className="av-cluster">
            <div className="av-cluster-t">Term</div>
            <div className="av-gd2">
              <Ro label="Start" value={startDateValue(data.periodStart)} />
              <Ro label="End" value={endDateValue(data.periodEnd)} />
            </div>
            <div className="av-mt8">
              <Ro label="Duration" value={durationText(data.periodStart, data.periodEnd)} />
            </div>
          </div>

          {/* ── Operation ── */}
          <div className="av-cluster">
            <div className="av-cluster-t">Operation</div>
            <Ro label="Crew sets" value={String(input.crewSets ?? '')} />
            <div className="av-gd2 av-mt8">
              <Ro label="Environment" value={cap(input.environment)} />
              <Ro label="Lease type" value={cap(input.leaseType)} />
            </div>
            {input.fixedCostCoverageEnabled && (
              <div className="av-gd2 av-mt8">
                <Ro label="Coverage %" value={String(input.fixedCostCoveragePercent ?? '')} />
                <Ro label="Coverage months" value={String(input.fixedCostCoverageMonths ?? '')} />
              </div>
            )}
          </div>

          {/* ── View (results scope / currency / cost basis — interactive) ── */}
          <div className="av-cluster">
            <div className="av-cluster-t">View</div>
            <Sg
              label="Results scope"
              value={selectedMsn === null ? 'total' : String(selectedMsn)}
              options={[
                { value: 'total', label: 'Total' },
                ...msnInputs.map((i) => ({ value: String(i.msn), label: String(i.msn) })),
              ]}
              onChange={(v) => setSelectedMsn(v === 'total' ? null : Number(v))}
            />
            <div className="av-gd2 av-mt8">
              <Sg
                label="Currency"
                value={displayCurrency}
                options={[
                  { value: 'eur', label: 'EUR' },
                  { value: 'usd', label: 'USD' },
                ]}
                onChange={(v) => setDisplayCurrency(v as 'eur' | 'usd')}
              />
              {canViewNaked && (
                <Sg
                  label="Cost basis"
                  value={rateBasis}
                  options={[
                    { value: 'current', label: 'Current' },
                    { value: 'naked', label: 'Naked' },
                  ]}
                  onChange={(v) => setRateBasis(v as 'current' | 'naked')}
                />
              )}
            </div>
          </div>
        </div>
    </div>
  )
}
