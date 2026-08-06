'use client'

import { fmt } from '@/lib/format'
import { SWEEP_PARAMS, type SweepParamKey } from './useSensitivitySweep'

interface SensitivitySetupPanelProps {
  selected: Set<SweepParamKey>
  intervals: Record<string, string>
  /** Live base value per parameter for the current scope. */
  bases: Record<string, number>
  scopeLabel: string
  onToggle: (key: SweepParamKey) => void
  onInterval: (key: SweepParamKey, value: string) => void
  onRun: () => void
  disabled: boolean
  error: string | null
}

export function SensitivitySetupPanel({
  selected,
  intervals,
  bases,
  scopeLabel,
  onToggle,
  onInterval,
  onRun,
  disabled,
  error,
}: SensitivitySetupPanelProps) {
  return (
    <div className="av-panel flex flex-col">
      <div className="av-panel-h">
        <h2>Sensitivity</h2>
        <span className="av-hint">combined sweep · ±2 steps</span>
      </div>
      <div className="flex-1 flex flex-col gap-2 p-[14px_16px]">
        {SWEEP_PARAMS.map((p) => {
          const on = selected.has(p.key)
          return (
            <div
              key={p.key}
              // The whole row is the toggle target — only the interval control
              // of an already-selected row opts out (see the label below).
              role="button"
              tabIndex={0}
              aria-pressed={on}
              aria-label={`${p.label} — include in sweep`}
              onClick={() => onToggle(p.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onToggle(p.key)
                }
              }}
              className="grid grid-cols-[1fr_auto_92px] items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer select-none"
              style={{
                border: `1px solid ${on ? 'var(--cyan)' : 'var(--line-2)'}`,
                background: on ? 'var(--cyan-soft)' : 'transparent',
              }}
            >
              <span
                className={`av-chip-t inline-block${on ? ' on' : ''}`}
                style={{ justifySelf: 'start' }}
              >
                {p.label}
              </span>
              <span className="text-[10.5px] av-num" style={{ color: 'var(--muted)' }}>
                base {fmt(bases[p.key] ?? 0, p.key === 'cycleRatio' ? 2 : 0)}
              </span>
              {/* Once the row is selected the interval is editable, so clicks
                  and keys here must not deselect it. While unselected the
                  input is disabled and click-through, so this whole corner
                  still selects the row like the rest of the box. */}
              <label
                className="flex items-center gap-1.5 text-[10px]"
                style={{ color: 'var(--muted)' }}
                onClick={on ? (e) => e.stopPropagation() : undefined}
                onKeyDown={on ? (e) => e.stopPropagation() : undefined}
              >
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={intervals[p.key]}
                  onChange={(e) => onInterval(p.key, e.target.value)}
                  disabled={!on}
                  aria-label={`${p.label} interval${p.unit ? ` (${p.unit})` : ''}`}
                  className="av-input av-num text-right w-full !py-1 disabled:opacity-40 disabled:pointer-events-none"
                />
                {p.unit && <span className="shrink-0">{p.unit}</span>}
              </label>
            </div>
          )
        })}

        {error && (
          <p className="text-[11px]" style={{ color: 'var(--neg)' }}>{error}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <span className="text-[10.5px]" style={{ color: 'var(--muted)' }}>
            Shifts each selected parameter by ±2 steps of its interval · scope: {scopeLabel}
          </span>
          <button
            onClick={onRun}
            disabled={disabled}
            className="av-btn av-btn-cyan !text-xs shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Run analysis
          </button>
        </div>
      </div>
    </div>
  )
}
