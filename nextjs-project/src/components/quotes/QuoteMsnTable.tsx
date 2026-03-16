import type { MsnPnlSummary } from '@/lib/pnl-engine'
import type { QuoteMsnSnapshot } from '@/app/actions/quotes'

interface QuoteMsnTableProps {
  msnSnapshots: QuoteMsnSnapshot[]
  msnSummaries: MsnPnlSummary[]
}

const fmtNum = (v: number) =>
  v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const fmtDec = (v: number) =>
  v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function QuoteMsnTable({ msnSnapshots, msnSummaries }: QuoteMsnTableProps) {
  // Compute totals across all MSNs
  const totals = msnSummaries.reduce(
    (acc, s) => ({
      totalRevenue: acc.totalRevenue + s.totalRevenue,
      totalCost: acc.totalCost + s.totalCost,
      netProfit: acc.netProfit + s.netProfit,
      totalBh: acc.totalBh + s.totalBh,
    }),
    { totalRevenue: 0, totalCost: 0, netProfit: 0, totalBh: 0 },
  )
  const totalAcmiCostPerBh = totals.totalBh > 0 ? totals.totalCost / totals.totalBh : 0
  const totalAcmiRatePerBh = totals.totalBh > 0 ? totals.totalRevenue / totals.totalBh : 0

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          MSN Breakdown
        </h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
            <th className="text-left px-4 py-2 font-medium">MSN</th>
            <th className="text-left px-4 py-2 font-medium">Type</th>
            <th className="text-right px-4 py-2 font-medium">ACMI Rate/BH</th>
            <th className="text-right px-4 py-2 font-medium">ACMI Cost/BH</th>
            <th className="text-right px-4 py-2 font-medium">Net Profit</th>
          </tr>
        </thead>
        <tbody>
          {msnSnapshots.map((snap, idx) => {
            const summary = msnSummaries[idx]
            if (!summary) return null

            return (
              <tr
                key={snap.id}
                className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/50"
              >
                <td className="px-4 py-2 text-gray-800 dark:text-gray-200 font-medium">
                  {snap.msn}
                </td>
                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                  {snap.aircraft_type}
                </td>
                <td className="px-4 py-2 text-right text-indigo-600 dark:text-indigo-300 font-mono font-medium">
                  {fmtDec(summary.acmiRatePerBh)}
                </td>
                <td className="px-4 py-2 text-right text-gray-800 dark:text-gray-200 font-mono">
                  {fmtNum(summary.acmiCostPerBh)}
                </td>
                <td className="px-4 py-2 text-right font-mono">
                  <span
                    className={
                      summary.netProfit >= 0
                        ? 'text-green-400'
                        : 'text-red-400'
                    }
                  >
                    {fmtNum(summary.netProfit)}
                  </span>
                </td>
              </tr>
            )
          })}
          {/* Total row when more than 1 aircraft */}
          {msnSummaries.length > 1 && (
            <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-100/40 dark:bg-gray-800/40">
              <td className="px-4 py-2 text-gray-900 dark:text-gray-100 font-semibold">
                Total
              </td>
              <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                {msnSummaries.length} A/C
              </td>
              <td className="px-4 py-2 text-right text-indigo-600 dark:text-indigo-300 font-mono font-semibold">
                {fmtDec(totalAcmiRatePerBh)}
              </td>
              <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100 font-mono font-semibold">
                {fmtNum(totalAcmiCostPerBh)}
              </td>
              <td className="px-4 py-2 text-right font-mono font-semibold">
                <span
                  className={
                    totals.netProfit >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }
                >
                  {fmtNum(totals.netProfit)}
                </span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
