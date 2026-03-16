'use client'

import { EditableCell } from '@/components/ui/EditableCell'
import { fmtInt } from '@/lib/format'
import { thBase, tdBase, tdLabel, tdNum, tdComputed, borderRow } from '@/components/ui/table-styles'

export interface PerDiemData {
  pilotFD: number
  pilotNFD: number
  bhBonusFD: number
  bhBonusNFD: number
  a321FD: number
  a321NFD: number
  a320FD: number
  a320NFD: number
  moistFD: number
  moistNFD: number
  pilotTotal: number
  bhBonusTotal: number
  a321Total: number
  a320Total: number
  moistTotal: number
}

export interface PerDiemSummarySectionProps {
  fdDays: number
  nfdDays: number
  perDiem: PerDiemData
  onSetFdDays: (v: number) => void
  onSetNfdDays: (v: number) => void
}

export function PerDiemSummarySection({
  fdDays,
  nfdDays,
  perDiem,
  onSetFdDays,
  onSetNfdDays,
}: PerDiemSummarySectionProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Per Diem Summary</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {/* Lease type header row */}
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-100/20 dark:bg-gray-800/20">
              <th className={`${thBase} text-left`}></th>
              <th className={`${thBase} text-right`}></th>
              <th colSpan={2} className={`${thBase} text-center border-l border-gray-300 dark:border-gray-700`}>
                Wet / Moist / Damp Lease
              </th>
              <th colSpan={2} className={`${thBase} text-center border-l border-gray-300 dark:border-gray-700`}>
                Wet Lease
              </th>
              <th className={`${thBase} text-center border-l border-gray-300 dark:border-gray-700`}>
                Moist Lease
              </th>
            </tr>
            {/* Column headers */}
            <tr className="border-b border-gray-300 dark:border-gray-700 bg-gray-100/40 dark:bg-gray-800/40">
              <th className={`${thBase} text-left`}></th>
              <th className={`${thBase} text-right`}>Days</th>
              <th className={`${thBase} text-right border-l border-gray-300 dark:border-gray-700`}>PILOT A321/A320</th>
              <th className={`${thBase} text-right`}>BH Bonus for Pilot</th>
              <th className={`${thBase} text-right border-l border-gray-300 dark:border-gray-700`}>A321</th>
              <th className={`${thBase} text-right`}>A320</th>
              <th className={`${thBase} text-right border-l border-gray-300 dark:border-gray-700`}>A321/A320</th>
            </tr>
          </thead>
          <tbody>
            {/* FD row */}
            <tr className={borderRow}>
              <td className={`${tdLabel} font-medium`}>FD</td>
              <td className={`${tdBase} text-right`}>
                <EditableCell value={fdDays} onChange={v => onSetFdDays(v ?? 0)} decimals={0} formatFn={v => fmtInt(v)} />
              </td>
              <td className={`${tdComputed} border-l border-gray-200/60 dark:border-gray-800/60`}>{fmtInt(perDiem.pilotFD)}</td>
              <td className={`${tdBase} text-right font-mono`}>
                <span className="px-2 py-0.5 rounded bg-emerald-900/25 border border-emerald-700/30 text-emerald-300">
                  {fmtInt(perDiem.bhBonusFD)}
                </span>
              </td>
              <td className={`${tdComputed} border-l border-gray-200/60 dark:border-gray-800/60`}>{fmtInt(perDiem.a321FD)}</td>
              <td className={tdComputed}>{fmtInt(perDiem.a320FD)}</td>
              <td className={`${tdComputed} border-l border-gray-200/60 dark:border-gray-800/60`}>{fmtInt(perDiem.moistFD)}</td>
            </tr>
            {/* Non-FD row */}
            <tr className={borderRow}>
              <td className={`${tdLabel} font-medium`}>Non-FD</td>
              <td className={`${tdBase} text-right`}>
                <EditableCell value={nfdDays} onChange={v => onSetNfdDays(v ?? 0)} decimals={0} formatFn={v => fmtInt(v)} />
              </td>
              <td className={`${tdComputed} border-l border-gray-200/60 dark:border-gray-800/60`}>{fmtInt(perDiem.pilotNFD)}</td>
              <td className={`${tdBase} text-right font-mono`}>
                <span className="px-2 py-0.5 rounded bg-emerald-900/25 border border-emerald-700/30 text-emerald-300">
                  {fmtInt(perDiem.bhBonusNFD)}
                </span>
              </td>
              <td className={`${tdComputed} border-l border-gray-200/60 dark:border-gray-800/60`}>{fmtInt(perDiem.a321NFD)}</td>
              <td className={tdComputed}>{fmtInt(perDiem.a320NFD)}</td>
              <td className={`${tdComputed} border-l border-gray-200/60 dark:border-gray-800/60`}>{fmtInt(perDiem.moistNFD)}</td>
            </tr>
            {/* Totals row */}
            <tr className="border-t border-gray-300 dark:border-gray-600 bg-gray-100/30 dark:bg-gray-800/30 font-medium">
              <td className={tdLabel}></td>
              <td className={`${tdBase} text-right text-xs text-gray-500 dark:text-gray-400`}>Per Diem per Crew Set</td>
              <td className={`${tdNum} border-l border-gray-200/60 dark:border-gray-800/60 text-indigo-600 dark:text-indigo-300`}>{fmtInt(perDiem.pilotTotal)}</td>
              <td className={`${tdNum} text-indigo-600 dark:text-indigo-300`}>{fmtInt(perDiem.bhBonusTotal)}</td>
              <td className={`${tdNum} border-l border-gray-200/60 dark:border-gray-800/60 text-indigo-600 dark:text-indigo-300`}>{fmtInt(perDiem.a321Total)}</td>
              <td className={`${tdNum} text-indigo-600 dark:text-indigo-300`}>{fmtInt(perDiem.a320Total)}</td>
              <td className={`${tdNum} border-l border-gray-200/60 dark:border-gray-800/60 text-indigo-600 dark:text-indigo-300`}>{fmtInt(perDiem.moistTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
