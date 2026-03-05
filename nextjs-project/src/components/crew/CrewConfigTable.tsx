'use client'

import { useState, useCallback, useMemo } from 'react'
import { usePricingStore } from '@/stores/pricing-store'

// ──────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────

interface PayrollRow {
  position: string
  grossSalary: number
  benefits: number
  perDiemFD: number
  perDiemNFD: number
  perBhPerdiem: number
}

interface CostRow {
  item: string
  amount: number | null
}

interface TrainingRow {
  item: string
  amount: number | null
}

// ──────────────────────────────────────────────────────
// Initial data from "Crew Cost.xlsx" (yellow cells)
// ──────────────────────────────────────────────────────

const INITIAL_PAYROLL: PayrollRow[] = [
  { position: 'Flight-pilot, Instructor', grossSalary: 6036.31, benefits: 178, perDiemFD: 355, perDiemNFD: 60, perBhPerdiem: 11 },
  { position: 'Co-pilot', grossSalary: 4480.45, benefits: 178, perDiemFD: 230, perDiemNFD: 60, perBhPerdiem: 5 },
  { position: 'Cabin Attendant / Steward(ess)', grossSalary: 1222.50, benefits: 178, perDiemFD: 100, perDiemNFD: 60, perBhPerdiem: 0 },
  { position: 'Cabin Attendant / Steward(ess)', grossSalary: 1222.50, benefits: 178, perDiemFD: 100, perDiemNFD: 60, perBhPerdiem: 0 },
  { position: 'Cabin Attendant / Steward(ess)', grossSalary: 1222.50, benefits: 178, perDiemFD: 100, perDiemNFD: 60, perBhPerdiem: 0 },
  { position: 'Cabin Attendant / Steward(ess)', grossSalary: 1222.50, benefits: 178, perDiemFD: 100, perDiemNFD: 60, perBhPerdiem: 0 },
  { position: 'Senior Cabin Attendant / Senior Steward(ess)', grossSalary: 1396.34, benefits: 178, perDiemFD: 150, perDiemNFD: 60, perBhPerdiem: 0 },
  { position: 'Senior Steward Instructor', grossSalary: 1572.73, benefits: 178, perDiemFD: 150, perDiemNFD: 60, perBhPerdiem: 0 },
]

const INITIAL_OTHER_COST: CostRow[] = [
  { item: 'Uniforms', amount: 110000 },
  { item: 'Travel costs', amount: 90000 },
  { item: 'Insurance validations', amount: null },
  { item: 'Crew Validation', amount: null },
  { item: 'Buffet (Overtime for emp.)', amount: 60000 },
  { item: 'Postholders', amount: null },
  { item: 'Accomodation', amount: 60000 },
]

const INITIAL_TRAINING: TrainingRow[] = [
  { item: 'Sim training permanent crew', amount: 264000 },
  { item: 'Sim training seasonal crew', amount: 0 },
  { item: 'Scandlearn permanent crew', amount: 60000 },
  { item: 'Scandlearn seasonal crew', amount: 0 },
  { item: 'CC training', amount: 120000 },
  { item: 'Upgrades in the company', amount: 30000 },
]

const INITIAL_AVERAGE_AC = 10.17
const INITIAL_FD_DAYS = 15
const INITIAL_NFD_DAYS = 16

// ──────────────────────────────────────────────────────
// Formatting helpers
// ──────────────────────────────────────────────────────

function fmt(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) return '-'
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtInt(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '-'
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtEur(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) return '-'
  return '\u20AC ' + value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// ──────────────────────────────────────────────────────
// Editable cell component
// ──────────────────────────────────────────────────────

function EditableCell({
  value,
  onChange,
  decimals = 2,
  formatFn,
}: {
  value: number | null
  onChange: (v: number | null) => void
  decimals?: number
  formatFn?: (v: number | null) => string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const displayValue = formatFn
    ? formatFn(value)
    : value !== null ? fmt(value, decimals) : '-'

  const startEdit = () => {
    setDraft(value !== null ? String(value) : '')
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    if (draft.trim() === '') {
      onChange(null)
    } else {
      const num = parseFloat(draft)
      if (!isNaN(num)) onChange(num)
    }
  }

  if (editing) {
    return (
      <input
        type="number"
        step="any"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-full bg-yellow-900/30 border border-yellow-600/50 rounded px-2 py-0.5 text-sm text-gray-100 text-right font-mono focus:border-yellow-400 focus:outline-none"
      />
    )
  }

  return (
    <span
      onClick={startEdit}
      className="cursor-pointer px-2 py-0.5 rounded bg-yellow-900/20 border border-yellow-700/30 hover:border-yellow-500/50 hover:bg-yellow-900/30 transition-colors font-mono text-gray-100 inline-block min-w-[60px] text-right"
      title="Click to edit"
    >
      {displayValue}
    </span>
  )
}

// ──────────────────────────────────────────────────────
// Shared table styles
// ──────────────────────────────────────────────────────

const thBase = 'px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider'
const tdBase = 'px-3 py-1.5 text-sm'
const tdNum = `${tdBase} text-right font-mono text-gray-100`
const tdLabel = `${tdBase} text-gray-300`
const tdComputed = `${tdBase} text-right font-mono text-gray-400`
const borderRow = 'border-b border-gray-800/60'

// ──────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────

export function CrewConfigTable() {
  // ── State: all yellow (editable) cells ──
  const [payroll, setPayroll] = useState<PayrollRow[]>(INITIAL_PAYROLL)
  const [otherCost, setOtherCost] = useState<CostRow[]>(INITIAL_OTHER_COST)
  const [training, setTraining] = useState<TrainingRow[]>(INITIAL_TRAINING)
  const [averageAC, setAverageAC] = useState(INITIAL_AVERAGE_AC)
  const [fdDays, setFdDays] = useState(INITIAL_FD_DAYS)
  const [nfdDays, setNfdDays] = useState(INITIAL_NFD_DAYS)

  // ── MGH from dashboard (green cells: Per BH Perdiem × MGH) ──
  const msnInputs = usePricingStore((s) => s.msnInputs)
  // Use first MSN's MGH as default, or 240 if no MSN added
  const mgh = useMemo(() => {
    if (msnInputs.length > 0 && msnInputs[0].mgh) {
      const val = parseFloat(msnInputs[0].mgh)
      if (!isNaN(val) && val > 0) return val
    }
    return 240
  }, [msnInputs])

  // ── Payroll update helper ──
  const updatePayroll = useCallback((idx: number, field: keyof PayrollRow, value: number | null) => {
    setPayroll(prev => prev.map((row, i) =>
      i === idx ? { ...row, [field]: value ?? 0 } : row
    ))
  }, [])

  // ── Computed: Social Security = Gross Salary + Benefits (formula: E = C + D) ──
  const socialSecurity = useMemo(() =>
    payroll.map(r => r.grossSalary + r.benefits),
    [payroll]
  )

  // ── Computed: Other Cost Per Month = Amount / Average_AC / 12 ──
  const otherCostPerMonth = useMemo(() =>
    otherCost.map(r => {
      if (r.amount === null || r.amount === 0 || averageAC === 0) return null
      return r.amount / averageAC / 12
    }),
    [otherCost, averageAC]
  )

  // ── Computed: Training Per Month = Amount / Average_AC / 12 ──
  const trainingPerMonth = useMemo(() =>
    training.map(r => {
      if (r.amount === null || r.amount === 0 || averageAC === 0) return null
      return r.amount / averageAC / 12
    }),
    [training, averageAC]
  )

  // ── Per Diem formulas (from Excel) ──
  // Rows: 0=Flight-pilot Instructor, 1=Co-pilot, 2-5=Cabin Attendants, 6=Senior CA, 7=Senior Instructor
  const perDiem = useMemo(() => {
    const p = payroll
    // D38 = SUM(F4:F5)*C38 → (pilot + copilot FD rate) * FD days
    const pilotFD = (p[0].perDiemFD + p[1].perDiemFD) * fdDays
    // D39 = SUM(G4:G5)*C39 → (pilot + copilot NFD rate) * NFD days
    const pilotNFD = (p[0].perDiemNFD + p[1].perDiemNFD) * nfdDays

    // E38 = H4 * MGH → Per BH Perdiem pilot instructor × MGH [GREEN]
    const bhBonusFD = p[0].perBhPerdiem * mgh
    // E39 = H5 * MGH → Per BH Perdiem co-pilot × MGH [GREEN]
    const bhBonusNFD = p[1].perBhPerdiem * mgh

    // F38 = SUM(F6:F10)*C38 → All cabin crew FD rates (rows 2-6) * FD days → A321 (5 cabin crew)
    const a321FD = (p[2].perDiemFD + p[3].perDiemFD + p[4].perDiemFD + p[5].perDiemFD + p[6].perDiemFD) * fdDays
    // F39 = SUM(G6:G10)*C39 → All cabin crew NFD rates * NFD days → A321
    const a321NFD = (p[2].perDiemNFD + p[3].perDiemNFD + p[4].perDiemNFD + p[5].perDiemNFD + p[6].perDiemNFD) * nfdDays

    // G38 = SUM(F7:F10)*C38 → Cabin crew rows 3-6 (excluding first regular) * FD days → A320 (4 cabin crew)
    const a320FD = (p[3].perDiemFD + p[4].perDiemFD + p[5].perDiemFD + p[6].perDiemFD) * fdDays
    // G39 = SUM(G7:G10)*C39 → A320 NFD
    const a320NFD = (p[3].perDiemNFD + p[4].perDiemNFD + p[5].perDiemNFD + p[6].perDiemNFD) * nfdDays

    // H38 = C38 * F10 → FD days * Senior CA FD rate → Moist lease
    const moistFD = fdDays * p[6].perDiemFD
    // H39 = C39 * G10 → NFD days * Senior CA NFD rate → Moist lease
    const moistNFD = nfdDays * p[6].perDiemNFD

    return {
      pilotFD, pilotNFD,
      bhBonusFD, bhBonusNFD,
      a321FD, a321NFD,
      a320FD, a320NFD,
      moistFD, moistNFD,
      // Totals: Per Diem per Crew Set
      pilotTotal: pilotFD + pilotNFD,
      bhBonusTotal: bhBonusFD + bhBonusNFD,
      a321Total: a321FD + a321NFD,
      a320Total: a320FD + a320NFD,
      moistTotal: moistFD + moistNFD,
    }
  }, [payroll, fdDays, nfdDays, mgh])

  // ──────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* MGH indicator */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-yellow-900/40 border border-yellow-700/40" />
          Editable (click to edit)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-900/40 border border-emerald-600/40" />
          BH rate &times; MGH ({mgh}h {msnInputs.length > 0 ? 'from Dashboard' : '— add MSN in Dashboard'})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-gray-800 border border-gray-700" />
          Calculated
        </span>
      </div>

      {/* ── TABLE 1: Payroll ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-100">Payroll data June 2025</h3>
          <p className="text-xs text-gray-500 mt-0.5">F2S</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/40">
                <th className={`${thBase} text-left`}>Position</th>
                <th className={`${thBase} text-right`}>Gross Salary, EUR</th>
                <th className={`${thBase} text-right`}>Benefits, EUR</th>
                <th className={`${thBase} text-right`}>Social security, BGN</th>
                <th className={`${thBase} text-right`}>Per diem rate - FD, EUR</th>
                <th className={`${thBase} text-right`}>Per diem rate - NFD, EUR</th>
                <th className={`${thBase} text-right`}>Per BH Perdiem EUR</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map((row, i) => (
                <tr key={i} className={borderRow}>
                  <td className={tdLabel}>{row.position}</td>
                  <td className={`${tdBase} text-right`}>
                    <EditableCell value={row.grossSalary} onChange={v => updatePayroll(i, 'grossSalary', v)} />
                  </td>
                  <td className={`${tdBase} text-right`}>
                    <EditableCell value={row.benefits} onChange={v => updatePayroll(i, 'benefits', v)} />
                  </td>
                  <td className={tdComputed}>{fmt(socialSecurity[i])}</td>
                  <td className={`${tdBase} text-right`}>
                    <EditableCell value={row.perDiemFD} onChange={v => updatePayroll(i, 'perDiemFD', v)} decimals={0} formatFn={v => fmtInt(v)} />
                  </td>
                  <td className={`${tdBase} text-right`}>
                    <EditableCell value={row.perDiemNFD} onChange={v => updatePayroll(i, 'perDiemNFD', v)} decimals={0} formatFn={v => fmtInt(v)} />
                  </td>
                  <td className={`${tdBase} text-right`}>
                    {/* Only pilots (rows 0-1) have editable Per BH Perdiem (yellow in Excel) */}
                    {i <= 1 ? (
                      <EditableCell value={row.perBhPerdiem} onChange={v => updatePayroll(i, 'perBhPerdiem', v)} decimals={0} formatFn={v => fmtInt(v)} />
                    ) : (
                      <span className="font-mono text-gray-500">{fmtInt(row.perBhPerdiem)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-gray-700 bg-gray-800/30 flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400">Average AC:</span>
          <EditableCell value={averageAC} onChange={v => setAverageAC(v ?? 1)} />
        </div>
      </div>

      {/* ── TABLES 2 & 3: Other Cost + Training side by side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Other Cost */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-gray-100">OTHER COST</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/40">
                <th className={`${thBase} text-left`}>Item</th>
                <th className={`${thBase} text-right`}>Amount</th>
                <th className={`${thBase} text-right`}>Per Month</th>
              </tr>
            </thead>
            <tbody>
              {otherCost.map((row, i) => (
                <tr key={i} className={borderRow}>
                  <td className={tdLabel}>{row.item}</td>
                  <td className={`${tdBase} text-right`}>
                    <EditableCell
                      value={row.amount}
                      onChange={v => setOtherCost(prev => prev.map((r, j) => j === i ? { ...r, amount: v } : r))}
                      decimals={0}
                      formatFn={v => v !== null ? fmtEur(v, 0) : '-'}
                    />
                  </td>
                  <td className={tdComputed}>
                    {otherCostPerMonth[i] !== null ? fmtEur(otherCostPerMonth[i]) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Training */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-gray-100">Training</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/40">
                <th className={`${thBase} text-left`}>Item</th>
                <th className={`${thBase} text-right`}>Amount</th>
                <th className={`${thBase} text-right`}>Per Month</th>
              </tr>
            </thead>
            <tbody>
              {training.map((row, i) => (
                <tr key={i} className={borderRow}>
                  <td className={tdLabel}>{row.item}</td>
                  <td className={`${tdBase} text-right`}>
                    <EditableCell
                      value={row.amount}
                      onChange={v => setTraining(prev => prev.map((r, j) => j === i ? { ...r, amount: v } : r))}
                      decimals={0}
                      formatFn={v => v !== null ? fmtEur(v, 0) : '-'}
                    />
                  </td>
                  <td className={tdComputed}>
                    {trainingPerMonth[i] !== null ? fmtEur(trainingPerMonth[i]) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TABLE 4: Per Diem Summary ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-100">Per Diem Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {/* Lease type header row */}
              <tr className="border-b border-gray-800 bg-gray-800/20">
                <th className={`${thBase} text-left`}></th>
                <th className={`${thBase} text-right`}></th>
                <th colSpan={2} className={`${thBase} text-center border-l border-gray-700`}>
                  Wet / Moist / Damp Lease
                </th>
                <th colSpan={2} className={`${thBase} text-center border-l border-gray-700`}>
                  Wet Lease
                </th>
                <th className={`${thBase} text-center border-l border-gray-700`}>
                  Moist Lease
                </th>
              </tr>
              {/* Column headers */}
              <tr className="border-b border-gray-700 bg-gray-800/40">
                <th className={`${thBase} text-left`}></th>
                <th className={`${thBase} text-right`}>Days</th>
                <th className={`${thBase} text-right border-l border-gray-700`}>PILOT A321/A320</th>
                <th className={`${thBase} text-right`}>BH Bonus for Pilot</th>
                <th className={`${thBase} text-right border-l border-gray-700`}>A321</th>
                <th className={`${thBase} text-right`}>A320</th>
                <th className={`${thBase} text-right border-l border-gray-700`}>A321/A320</th>
              </tr>
            </thead>
            <tbody>
              {/* FD row */}
              <tr className={borderRow}>
                <td className={`${tdLabel} font-medium`}>FD</td>
                <td className={`${tdBase} text-right`}>
                  <EditableCell value={fdDays} onChange={v => setFdDays(v ?? 0)} decimals={0} formatFn={v => fmtInt(v)} />
                </td>
                <td className={`${tdComputed} border-l border-gray-800/60`}>{fmtInt(perDiem.pilotFD)}</td>
                <td className={`${tdBase} text-right font-mono`}>
                  <span className="px-2 py-0.5 rounded bg-emerald-900/25 border border-emerald-700/30 text-emerald-300">
                    {fmtInt(perDiem.bhBonusFD)}
                  </span>
                </td>
                <td className={`${tdComputed} border-l border-gray-800/60`}>{fmtInt(perDiem.a321FD)}</td>
                <td className={tdComputed}>{fmtInt(perDiem.a320FD)}</td>
                <td className={`${tdComputed} border-l border-gray-800/60`}>{fmtInt(perDiem.moistFD)}</td>
              </tr>
              {/* Non-FD row */}
              <tr className={borderRow}>
                <td className={`${tdLabel} font-medium`}>Non-FD</td>
                <td className={`${tdBase} text-right`}>
                  <EditableCell value={nfdDays} onChange={v => setNfdDays(v ?? 0)} decimals={0} formatFn={v => fmtInt(v)} />
                </td>
                <td className={`${tdComputed} border-l border-gray-800/60`}>{fmtInt(perDiem.pilotNFD)}</td>
                <td className={`${tdBase} text-right font-mono`}>
                  <span className="px-2 py-0.5 rounded bg-emerald-900/25 border border-emerald-700/30 text-emerald-300">
                    {fmtInt(perDiem.bhBonusNFD)}
                  </span>
                </td>
                <td className={`${tdComputed} border-l border-gray-800/60`}>{fmtInt(perDiem.a321NFD)}</td>
                <td className={tdComputed}>{fmtInt(perDiem.a320NFD)}</td>
                <td className={`${tdComputed} border-l border-gray-800/60`}>{fmtInt(perDiem.moistNFD)}</td>
              </tr>
              {/* Totals row */}
              <tr className="border-t border-gray-600 bg-gray-800/30 font-medium">
                <td className={tdLabel}></td>
                <td className={`${tdBase} text-right text-xs text-gray-400`}>Per Diem per Crew Set</td>
                <td className={`${tdNum} border-l border-gray-800/60 text-indigo-300`}>{fmtInt(perDiem.pilotTotal)}</td>
                <td className={`${tdNum} text-indigo-300`}>{fmtInt(perDiem.bhBonusTotal)}</td>
                <td className={`${tdNum} border-l border-gray-800/60 text-indigo-300`}>{fmtInt(perDiem.a321Total)}</td>
                <td className={`${tdNum} text-indigo-300`}>{fmtInt(perDiem.a320Total)}</td>
                <td className={`${tdNum} border-l border-gray-800/60 text-indigo-300`}>{fmtInt(perDiem.moistTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
