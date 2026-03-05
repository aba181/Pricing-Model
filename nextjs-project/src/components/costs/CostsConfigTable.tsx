'use client'

import { useState, useMemo, useCallback } from 'react'

// ---- Editable Cell (yellow background on hover/focus) ----

function EditableCell({
  value,
  onChange,
  decimals = 2,
  className = '',
}: {
  value: number
  onChange: (v: number) => void
  decimals?: number
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const display = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        step="any"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false)
          const parsed = parseFloat(draft)
          if (!isNaN(parsed)) onChange(parsed)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setEditing(false)
            const parsed = parseFloat(draft)
            if (!isNaN(parsed)) onChange(parsed)
          }
          if (e.key === 'Escape') setEditing(false)
        }}
        className={`w-full bg-yellow-900/40 border border-yellow-600 rounded px-2 py-0.5 text-right text-sm text-gray-100 focus:outline-none ${className}`}
      />
    )
  }

  return (
    <span
      onClick={() => {
        setDraft(String(value))
        setEditing(true)
      }}
      className={`block w-full cursor-pointer rounded px-2 py-0.5 text-right text-sm text-gray-100 bg-yellow-900/20 border border-yellow-700/40 hover:border-yellow-500 transition-colors ${className}`}
      title="Click to edit"
    >
      {display}
    </span>
  )
}

function FormulaCell({
  value,
  decimals = 2,
  className = '',
}: {
  value: number
  decimals?: number
  className?: string
}) {
  const display = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return (
    <span className={`block text-right text-sm text-gray-300 px-2 py-0.5 ${className}`}>
      {display}
    </span>
  )
}

// ---- Section Header ----

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mt-6 mb-2">
      <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">
        {title}
      </h3>
    </div>
  )
}

// ---- Table wrapper ----

function TableCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">{children}</table>
      </div>
    </div>
  )
}

// ---- Data types ----

interface MaintPersonnel {
  name: string
  engineers: number
  perDiem: number
  days: number
}

interface MaintCostItem {
  name: string
  perMonthPerAc: number
  mapping: string
}

interface InsuranceItem {
  msn: number
  priceUsd: number
}

interface DocItem {
  name: string
  total: number
  mapping: string
}

interface OtherCogsItem {
  name: string
  perMonth: number
  mapping: string
  hasTotal?: boolean
  total?: number
}

interface OverheadItem {
  name: string
  total: number
  mapping: string
}

// ---- Initial data from Excel ----

const INITIAL_MAINT_PERSONNEL: MaintPersonnel[] = [
  { name: 'B2 - Avionics', engineers: 2, perDiem: 150, days: 31 },
  { name: 'B1 - Mechanic', engineers: 1, perDiem: 130, days: 31 },
  { name: 'General', engineers: 1, perDiem: 75, days: 31 },
]

const INITIAL_MAINT_COSTS: MaintCostItem[] = [
  { name: 'Line Maintenance - Internal', perMonthPerAc: 28000, mapping: 'Line Maintenance' },
  { name: 'Line Maintenance - 3rd Party', perMonthPerAc: 10000, mapping: 'Line Maintenance' },
  { name: 'Aircraft Maintenance - Internal (AD-HOC)', perMonthPerAc: 0, mapping: 'Line Maintenance' },
  { name: 'C-Check', perMonthPerAc: 13636.4, mapping: 'Maintenance C-Check' },
  { name: 'Maintenance Personnel Salary', perMonthPerAc: 10038.36, mapping: 'Maintenance personnel - salary' },
  { name: 'Tires/Wheels', perMonthPerAc: 50000, mapping: '' },
  { name: 'Spare Parts KPI (Per BH)', perMonthPerAc: 231, mapping: '' },
  { name: 'Capital Maintenance', perMonthPerAc: 10000, mapping: 'Base Maintenance' },
  { name: 'Accomodation & Travel M', perMonthPerAc: 3000, mapping: 'Accomodation & Travel M' },
  { name: 'Trainning', perMonthPerAc: 37.5, mapping: 'Trainning' },
]

const INITIAL_INSURANCE: InsuranceItem[] = [
  { msn: 3378, priceUsd: 13111 },
  { msn: 4247, priceUsd: 19128 },
  { msn: 3055, priceUsd: 13019 },
  { msn: 3461, priceUsd: 14269 },
  { msn: 3605, priceUsd: 16583 },
  { msn: 5228, priceUsd: 23138 },
  { msn: 5931, priceUsd: 0 }, // formula: AVERAGE of others
  { msn: 1932, priceUsd: 16197 },
  { msn: 1960, priceUsd: 16197 },
  { msn: 3570, priceUsd: 14654 },
  { msn: 1503, priceUsd: 18704 },
]

const INITIAL_DOC: DocItem[] = [
  { name: 'Fuel', total: 154666.70, mapping: 'Fuel' },
  { name: 'Handling', total: 119675.72, mapping: 'Handling' },
  { name: 'Navigation', total: 23204.46, mapping: 'Navigation' },
  { name: 'Airport Charges', total: 52516.09, mapping: 'Airport Charges' },
]

const INITIAL_OTHER_COGS: OtherCogsItem[] = [
  { name: 'Commission - Third Party Summer', perMonth: 200, mapping: 'Commissions' },
  { name: 'Commission - Third Party Winter', perMonth: 100, mapping: 'Commissions' },
  { name: 'Commission - MXC', perMonth: 42, mapping: 'Commissions' },
  { name: 'Other Fixed', perMonth: 0, mapping: 'Other Fixed', hasTotal: true, total: 87864.36 },
  { name: 'Technical', perMonth: 0, mapping: 'Technical', hasTotal: true, total: 970898 },
]

const INITIAL_OVERHEAD: OverheadItem[] = [
  { name: 'Personnel Cost - SS', total: 975146.71, mapping: 'Corporate Support Services - SS' },
  { name: 'Personnel Cost', total: 2558288.11, mapping: 'AM, FLT OPS, GROUND OPS, AVSEC, COMPLIANCE, CD, SAFETY, TRAINNING' },
  { name: 'Travel Expenses', total: 206415, mapping: 'Travel Expenses' },
  { name: 'Legal Expenses', total: 42600, mapping: 'Legal Expenses' },
  { name: 'License & Registration Cost', total: 0, mapping: 'License & Registration Cost' },
  { name: 'Admin Cost', total: 764579.49, mapping: 'Admin Cost' },
  { name: 'IT and Communications', total: 391737.45, mapping: 'Other O' },
  { name: 'Admin and General Expenses', total: 234710, mapping: 'Admin and General Expenses' },
  { name: 'Selling & Marketing Cost', total: 118298.94, mapping: 'Selling & Marketing Cost' },
]

// ---- Main Component ----

export function CostsConfigTable() {
  // State
  const [maintPersonnel, setMaintPersonnel] = useState(INITIAL_MAINT_PERSONNEL)
  const [maintCosts, setMaintCosts] = useState(INITIAL_MAINT_COSTS)
  const [insurance, setInsurance] = useState(INITIAL_INSURANCE)
  const [doc, setDoc] = useState(INITIAL_DOC)
  const [otherCogs, setOtherCogs] = useState(INITIAL_OTHER_COGS)
  const [overhead, setOverhead] = useState(INITIAL_OVERHEAD)
  const [avgAc, setAvgAc] = useState(10.166667)

  // ---- Update helpers ----
  const updateMaintPersonnel = useCallback((idx: number, field: keyof MaintPersonnel, value: number) => {
    setMaintPersonnel((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }, [])

  const updateMaintCost = useCallback((idx: number, value: number) => {
    setMaintCosts((prev) => prev.map((item, i) => (i === idx ? { ...item, perMonthPerAc: value } : item)))
  }, [])

  const updateInsurance = useCallback((idx: number, value: number) => {
    setInsurance((prev) => prev.map((item, i) => (i === idx ? { ...item, priceUsd: value } : item)))
  }, [])

  const updateDoc = useCallback((idx: number, value: number) => {
    setDoc((prev) => prev.map((item, i) => (i === idx ? { ...item, total: value } : item)))
  }, [])

  const updateOtherCogs = useCallback((idx: number, field: 'perMonth' | 'total', value: number) => {
    setOtherCogs((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)))
  }, [])

  const updateOverhead = useCallback((idx: number, value: number) => {
    setOverhead((prev) => prev.map((item, i) => (i === idx ? { ...item, total: value } : item)))
  }, [])

  // ---- Computed values ----

  // Maintenance Personnel totals per row
  const maintPersonnelTotals = useMemo(
    () => maintPersonnel.map((p) => p.engineers * p.perDiem * p.days),
    [maintPersonnel]
  )
  const maintPersonnelGrandTotal = useMemo(
    () => maintPersonnelTotals.reduce((s, v) => s + v, 0),
    [maintPersonnelTotals]
  )

  // Insurance: MSN 5931 (index 6) = average of all others
  const insuranceWithFormulas = useMemo(() => {
    const others = insurance.filter((_, i) => i !== 6)
    const avg = others.reduce((s, v) => s + v.priceUsd, 0) / others.length
    return insurance.map((item, i) => (i === 6 ? { ...item, priceUsd: avg } : item))
  }, [insurance])

  const insuranceTotal = useMemo(
    () => insuranceWithFormulas.reduce((s, v) => s + v.priceUsd, 0),
    [insuranceWithFormulas]
  )

  // DOC: Per month/Per AC = Total / avgAC / 12
  const docPerMonth = useMemo(
    () => doc.map((d) => (avgAc > 0 ? d.total / avgAc / 12 : 0)),
    [doc, avgAc]
  )

  // Other COGS: items with hasTotal compute perMonth from total
  const otherCogsComputed = useMemo(
    () =>
      otherCogs.map((item) => {
        if (item.hasTotal && item.total !== undefined) {
          // Other Fixed: total / 9 / 7; Technical: total / avgAC / 12
          if (item.name === 'Other Fixed') return { ...item, perMonth: item.total / 9 / 7 }
          if (item.name === 'Technical') return { ...item, perMonth: avgAc > 0 ? item.total / avgAc / 12 : 0 }
        }
        return item
      }),
    [otherCogs, avgAc]
  )

  // Overhead: Per Month = Total / avgAC / 12
  const overheadPerMonth = useMemo(
    () => overhead.map((o) => (avgAc > 0 ? o.total / avgAc / 12 : 0)),
    [overhead, avgAc]
  )
  const overheadTotalPerMonth = useMemo(
    () => overheadPerMonth.reduce((s, v) => s + v, 0),
    [overheadPerMonth]
  )

  // ---- Render ----

  const thClass = 'text-left px-3 py-2 text-gray-400 font-medium text-[10px] uppercase tracking-wider'
  const tdClass = 'px-3 py-1.5 text-sm text-gray-300'
  const tdLabelClass = 'px-3 py-1.5 text-sm text-gray-300 pl-4'
  const trHover = 'hover:bg-gray-800/20'
  const totalRowClass = 'border-t border-gray-600 font-semibold'

  return (
    <div className="space-y-6">
      {/* Average AC - global input */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center gap-4">
        <label className="text-sm text-gray-400 whitespace-nowrap">Average A/C:</label>
        <EditableCell value={avgAc} onChange={setAvgAc} decimals={2} className="w-28" />
      </div>

      {/* 1. Maintenance Personnel Cost */}
      <SectionHeader title="Maintenance Personnel Cost" />
      <TableCard>
        <thead>
          <tr className="border-b border-gray-700">
            <th className={`${thClass} w-[260px]`}>Name</th>
            <th className={`${thClass} w-[120px] text-right`}>No. Engineers per A/C</th>
            <th className={`${thClass} w-[140px] text-right`}>Per Diem, EUR/day</th>
            <th className={`${thClass} w-[100px] text-right`}>No. Days</th>
            <th className={`${thClass} w-[160px] text-right`}>Total Cost per A/C per Month</th>
          </tr>
        </thead>
        <tbody>
          {maintPersonnel.map((p, i) => (
            <tr key={i} className={trHover}>
              <td className={tdLabelClass}>{p.name}</td>
              <td className={tdClass}>
                <EditableCell value={p.engineers} onChange={(v) => updateMaintPersonnel(i, 'engineers', v)} decimals={0} />
              </td>
              <td className={tdClass}>
                <EditableCell value={p.perDiem} onChange={(v) => updateMaintPersonnel(i, 'perDiem', v)} decimals={0} />
              </td>
              <td className={tdClass}>
                <FormulaCell value={p.days} decimals={0} />
              </td>
              <td className={tdClass}>
                <FormulaCell value={maintPersonnelTotals[i]} decimals={2} />
              </td>
            </tr>
          ))}
          <tr className={totalRowClass}>
            <td className={`${tdClass} text-gray-100`} colSpan={4}>Total</td>
            <td className={tdClass}>
              <span className="block text-right text-sm text-gray-100 font-semibold px-2 py-0.5">
                {maintPersonnelGrandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </td>
          </tr>
        </tbody>
      </TableCard>

      {/* 2. Maintenance Cost Assumptions */}
      <SectionHeader title="Maintenance Cost Assumptions" />
      <TableCard>
        <thead>
          <tr className="border-b border-gray-700">
            <th className={`${thClass} w-[360px]`}>Name</th>
            <th className={`${thClass} w-[160px] text-right`}>Per Month / Per A/C</th>
            <th className={`${thClass} w-[220px]`}>P&L Mapping</th>
          </tr>
        </thead>
        <tbody>
          {maintCosts.map((item, i) => (
            <tr key={i} className={trHover}>
              <td className={tdLabelClass}>{item.name}</td>
              <td className={tdClass}>
                <EditableCell value={item.perMonthPerAc} onChange={(v) => updateMaintCost(i, v)} decimals={2} />
              </td>
              <td className={`${tdClass} text-gray-500 text-xs`}>{item.mapping}</td>
            </tr>
          ))}
        </tbody>
      </TableCard>

      {/* 3. Insurance */}
      <SectionHeader title="Insurance" />
      <TableCard>
        <thead>
          <tr className="border-b border-gray-700">
            <th className={`${thClass} w-[200px]`}>MSN</th>
            <th className={`${thClass} w-[160px] text-right`}>Price, USD</th>
          </tr>
        </thead>
        <tbody>
          {insuranceWithFormulas.map((item, i) => (
            <tr key={i} className={trHover}>
              <td className={tdLabelClass}>{item.msn}</td>
              <td className={tdClass}>
                {i === 6 ? (
                  // MSN 5931 = AVERAGE of others (formula cell)
                  <FormulaCell value={item.priceUsd} decimals={0} className="text-blue-300 italic" />
                ) : (
                  <EditableCell
                    value={item.priceUsd}
                    onChange={(v) => updateInsurance(i, v)}
                    decimals={0}
                  />
                )}
              </td>
            </tr>
          ))}
          <tr className={totalRowClass}>
            <td className={`${tdClass} text-gray-100`}>Total</td>
            <td className={tdClass}>
              <span className="block text-right text-sm text-gray-100 font-semibold px-2 py-0.5">
                {insuranceTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </td>
          </tr>
        </tbody>
      </TableCard>

      {/* 4. DOC */}
      <SectionHeader title="DOC (Direct Operating Cost)" />
      <TableCard>
        <thead>
          <tr className="border-b border-gray-700">
            <th className={`${thClass} w-[260px]`}>Name</th>
            <th className={`${thClass} w-[160px] text-right`}>Total</th>
            <th className={`${thClass} w-[160px] text-right`}>Per Month / Per A/C</th>
            <th className={`${thClass} w-[160px]`}>P&L Mapping</th>
          </tr>
        </thead>
        <tbody>
          {doc.map((item, i) => (
            <tr key={i} className={trHover}>
              <td className={tdLabelClass}>{item.name}</td>
              <td className={tdClass}>
                <EditableCell value={item.total} onChange={(v) => updateDoc(i, v)} decimals={2} />
              </td>
              <td className={tdClass}>
                <FormulaCell value={docPerMonth[i]} decimals={2} />
              </td>
              <td className={`${tdClass} text-gray-500 text-xs`}>{item.mapping}</td>
            </tr>
          ))}
        </tbody>
      </TableCard>

      {/* 5. Other COGS */}
      <SectionHeader title="Other COGS" />
      <TableCard>
        <thead>
          <tr className="border-b border-gray-700">
            <th className={`${thClass} w-[260px]`}>Name</th>
            <th className={`${thClass} w-[160px] text-right`}>Total</th>
            <th className={`${thClass} w-[160px] text-right`}>Per Month / Per A/C</th>
            <th className={`${thClass} w-[160px]`}>P&L Mapping</th>
          </tr>
        </thead>
        <tbody>
          {otherCogsComputed.map((item, i) => (
            <tr key={i} className={trHover}>
              <td className={tdLabelClass}>{item.name}</td>
              <td className={tdClass}>
                {item.hasTotal ? (
                  <EditableCell
                    value={item.total ?? 0}
                    onChange={(v) => updateOtherCogs(i, 'total', v)}
                    decimals={2}
                  />
                ) : (
                  <span className="block text-right text-sm text-gray-500 px-2 py-0.5">—</span>
                )}
              </td>
              <td className={tdClass}>
                {item.hasTotal ? (
                  <FormulaCell value={item.perMonth} decimals={2} />
                ) : (
                  <EditableCell
                    value={item.perMonth}
                    onChange={(v) => updateOtherCogs(i, 'perMonth', v)}
                    decimals={0}
                  />
                )}
              </td>
              <td className={`${tdClass} text-gray-500 text-xs`}>{item.mapping}</td>
            </tr>
          ))}
        </tbody>
      </TableCard>

      {/* 6. Overhead */}
      <SectionHeader title="Overhead" />
      <TableCard>
        <thead>
          <tr className="border-b border-gray-700">
            <th className={`${thClass} w-[300px]`}>Name</th>
            <th className={`${thClass} w-[160px] text-right`}>Total</th>
            <th className={`${thClass} w-[160px] text-right`}>Per Month</th>
            <th className={`${thClass} w-[220px]`}>P&L Mapping</th>
          </tr>
        </thead>
        <tbody>
          {overhead.map((item, i) => (
            <tr key={i} className={trHover}>
              <td className={tdLabelClass}>{item.name}</td>
              <td className={tdClass}>
                <EditableCell value={item.total} onChange={(v) => updateOverhead(i, v)} decimals={2} />
              </td>
              <td className={tdClass}>
                <FormulaCell value={overheadPerMonth[i]} decimals={2} />
              </td>
              <td className={`${tdClass} text-gray-500 text-xs`}>{item.mapping}</td>
            </tr>
          ))}
          <tr className={totalRowClass}>
            <td className={`${tdClass} text-gray-100`} colSpan={2}>Total Overhead</td>
            <td className={tdClass}>
              <span className="block text-right text-sm text-gray-100 font-semibold px-2 py-0.5">
                {overheadTotalPerMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </td>
            <td />
          </tr>
        </tbody>
      </TableCard>
    </div>
  )
}
